# Security Model (RLS) - Abogado Sala

Definición de políticas de acceso (Row Level Security).
**Default: Deny All.**

## 1. Helper Functions (Plumbing)

Para mantener las policies limpias.

```sql
-- Obtener Org ID del usuario actual
create function auth.org_id() returns uuid as $$
  select org_id from public.profiles where id = auth.uid()
$$ language sql security definer;

-- Verificar si es Admin (Owner)
create function auth.is_admin() returns boolean as $$
  select role = 'admin' from public.profiles where id = auth.uid()
$$ language sql security definer;
```

## 2. Table Policies

### `organizations`

- **SELECT**: Users can see THEIR own org. `id = auth.org_id()`.
- **UPDATE**: Just Admins. `auth.is_admin() AND id = auth.org_id()`.

### `profiles`

- **SELECT**: Users can see profiles IN THEIR org. `org_id = auth.org_id()`.
- **UPDATE**: Users can update THEMSELVES. Admins can update EVERYONE in org.

### `clients` & `cases`

La lógica core de negocio.

- **Admin (Owner)**: Ve todo en su org.
- **Member (Lawyer)**: Ve SOLO lo asignado a él.

```sql
-- Policy: "Access Clients"
(auth.is_admin() AND org_id = auth.org_id())
OR
(assigned_lawyer_id = auth.uid())
```

### `templates`

- **Global Templates**:
  - `scope = 'global' AND org_id = auth.org_id()`.
  - Admin: Read/Write.
  - Member: Read Only.
- **Private Templates**:
  - `owner_id = auth.uid()`.
  - Member: Full Control.

---

## 3. Storage Policies (Buckets)

### Bucket: `secure-docs`

Estructura: `/{org_id}/{case_id}/{file.pdf}`

- **INSERT (Upload)**:
  - Client (Guest): Permitido si tiene Token válido de Case (Logica Edge Function o Signed View).
  - Lawyer: Permitido si tiene acceso al Case (RLS check).
- **SELECT (Download)**:
  - Solo Authenticated Users con acceso al Case (check DB).

---

## 4. Auth Triggers

Al crearse un usuario en `auth.users`, se debe inicializar `public.profiles`.
Esto se maneja con un Trigger `after insert on auth.users`.

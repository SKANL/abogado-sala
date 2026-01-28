# Database Schema Design - Abogado Sala

Diseño optimizado para PostgreSQL (Supabase).
**Principio: Multi-tenancy Nativo.** Cada fila pertenece a una `organization`.

## 1. Core Identity & Organization

### `organizations`

La "cuenta" del despacho.

- `id`: UUID (PK).
- `name`: Text.
- `slug`: Text (Unique).
- `plan_tier`: Enum (`trial`, `pro`, `enterprise`, `demo`).
- `plan_status`: Enum (`active`, `past_due`, `canceled`).
- `stripe_customer_id`: Text.
- `trial_ends_at`: Timestamptz.
- `storage_used`: BigInt.
- `logo_url`: Text (White Label).
- `primary_color`: Text.

### `profiles`

Información extendida del usuario (Linked 1:1 con `auth.users`).

- `id`: UUID (PK, FK `auth.users`).
- `org_id`: UUID (FK `organizations`).
- `role`: Enum (`admin`, `member`).
- `full_name`: Text.
- `avatar_url`: Text.
- `assigned_phone`: Text.

---

## 2. Business Entities

### `clients`

Personas físicas/jurídicas atendidas.

- `id`: UUID.
- `org_id`: UUID.
- `assigned_lawyer_id`: UUID (FK `profiles`).
- `full_name`: Text.
- `email`: Text.
- `phone`: Text.
- `status`: Enum (`prospect`, `active`, `archived`).
- **Constraint**: `unique(org_id, email)`.

### `cases` (aka "Salas")

El expediente o trámite activo.

- `id`: UUID.
- `client_id`: UUID.
- `org_id`: UUID.
- `template_snapshot`: JSONB.
- `current_step_index`: Int.
- `token`: Text (Unique).
- `status`: Enum (`draft`, `in_progress`, `review`, `completed`).
- `expires_at`: Timestamptz.

### `case_files`

Documentos subidos al expediente.

- `id`: UUID.
- `case_id`: UUID.
- `org_id`: UUID.
- `file_key`: Text (Storage Path).
- `file_size`: BigInt.
- `category`: Text.
- `status`: Enum (`pending`, `uploaded`, `missing`, `rejected`).
- `exception_reason`: Text.

---

## 3. Configuration & Assets

### `templates`

- `id`: UUID.
- `org_id`: UUID.
- `owner_id`: UUID.
- `title`: Text.
- `schema`: JSONB.
- `scope`: Enum (`private`, `global`).

### `plan_configs` (System)

Límites por plan.

- `plan`: PK (`plan_tier`).
- `max_clients`: Int.
- `max_admins`: Int.
- `max_storage_bytes`: BigInt.
- `can_white_label`: Boolean.

### `notifications` (System)

Alertas persistentes.

- `id`: UUID.
- `user_id`: UUID.
- `title`: Text.
- `type`: Enum-like Text.
- `read`: Boolean.

### `subscriptions` (System)

Historial Stripe.

- `id`: UUID.
- `status`: Enum `subscription_status` (Stripe mapping).
- `current_period_end`: Timestamptz.

---

## 4. Extensions & Indexes

- `pg_trgm`: Búsqueda fuzzy.
- `vector`: Future proofing.

### Indexes Críticos

- `clients(org_id, assigned_lawyer_id)`
- `cases(token)`
- `invitations(email)`
- `portal_analytics(case_id)`

---

## 5. Database Integrity & Automations

### 5.1 Quota Enforcement (Triggers & Locks)

- Uses `pg_advisory_xact_lock(hashtext('prefix' || org_id))` for serialization.
- Reads limits from `plan_configs`.

### 5.2 RLS Performance

- Uses `auth.org_id()` optimized helper.

### 5.3 Storage Garbage Collection

- `storage_delete_queue` table tracks deleted files.
- Triggers on `case_files` DELETE insert into queue.

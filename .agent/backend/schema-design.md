# Database Schema Design - Abogado Sala

Diseño optimizado para PostgreSQL (Supabase).
**Principio: Multi-tenancy Nativo.** Cada fila pertenece a una `organization`.

## 1. Core Identity & Organization

### `organizations`

La "cuenta" del despacho.

- `id`: UUID (PK).
- `name`: Text.
- `slug`: Text (Unique) - ej. `abogados-luz`.
- `plan_tier`: Enum (`trial`, `pro`, `enterprise`, `demo`).
- `plan_status`: Enum (`active`, `past_due`, `canceled`).
- `stripe_customer_id`: Text.
- `created_at`: Timestamp.

### `profiles`

Información extendida del usuario (Linked 1:1 con `auth.users`).

- `id`: UUID (PK, FK `auth.users`).
- `org_id`: UUID (FK `organizations`).
- `role`: Enum (`admin`, `member`).
- `full_name`: Text.
- `avatar_url`: Text.
- `assigned_phone`: Text (Para WhatsApp).

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

### `cases` (aka "Salas")

El expediente o trámite activo.

- `id`: UUID.
- `client_id`: UUID.
- `org_id`: UUID.
- `template_snapshot`: JSONB (Copia de la plantilla usada al crear).
- `current_step_index`: Int.
- `token`: Text (Unique, para URL pública).
- `status`: Enum (`draft`, `in_progress`, `review`, `completed`).

### `case_files`

Documentos subidos al expediente.

- `id`: UUID.
- `case_id`: UUID.
- `org_id`: UUID.
- `file_key`: Text (Storage Path).
- `category`: Text (ej. "DNI", "Contrato").
- `status`: Enum (`pending`, `uploaded`, `missing`, `rejected`).
- `exception_reason`: Text (Si status es `missing`).

---

## 3. Configuration & Assets

### `templates`

Plantillas de flujos creadas por abogados.

- `id`: UUID.
- `org_id`: UUID.
- `owner_id`: UUID (FK `profiles`).
- `title`: Text.
- `schema`: JSONB (Definición del flow).
- `scope`: Enum (`private`, `global`).

### `audit_logs`

Logs inmutables para compliance.

- `id`: UUID.
- `org_id`: UUID.
- `actor_id`: UUID.
- `action`: Text (ej. "VIEW_CASE", "DOWNLOAD_ZIP").
- `target_id`: UUID.
- `metadata`: JSONB.

---

## 4. Extensions & Indexes

- `pg_trgm`: Para búsqueda fuzzy de nombres.
- `vector`: (Opcional) Para search semántico futuro.

### Indexes Críticos

- `clients(org_id, assigned_lawyer_id)`
- `cases(token)`
- `audit_logs(org_id, created_at DESC)`

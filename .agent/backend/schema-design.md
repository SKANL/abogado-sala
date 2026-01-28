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
- `file_size`: BigInt (Bytes).
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

---

## 5. Database Integrity & Automations

To ensure robustness beyond the application layer, we implement DB-level controls.

### 5.1 Quota Enforcement (Triggers & Locks)

- **Mechanism**: `BEFORE INSERT` triggers on usage-limited tables (`clients`).
- **Concurrency Control**: Uses `pg_advisory_xact_lock(org_id_hash)` to serialize insertion attempts within the same organization. This prevents "Race Condition" attacks where parallel requests could bypass the `count(*)` check.
- **Logic**: Counts current usage vs Plan Tier limit.
- **Fail Check**: Raises SQL Exception `Plan limit reached` immediately.

### 5.2 RLS Performance Optimization

- **Strategy**: Avoid "Recursive DB Lookups" in RLS policies.
- **Implementation**:
  - `auth.org_id()` function checks `request.jwt.claims -> app_metadata -> org_id` first.
  - **Requirement**: The Auth Flow (likely a Supabase Auth Hook or Custom Claim logic) MUST populate `org_id` into the JWT `app_metadata` upon login/token refresh.
  - **Fallback**: If claim is missing, falls back to a DB query on `profiles` (slower, but functional).

### 5.2 Storage Garbage Collection (Mark & Sweep)

- **Problem**: `ON DELETE CASCADE` removes `case_files` rows but leaves orphan files in S3/Storage.
- **Solution**:
  1. **Mark**: Trigger `queue_storage_deletion` inserts file path into `storage_delete_queue` upon row deletion.
  2. **Sweep**: Scheduled Edge Function (Cron every 24h) reads queue and calls `storage.remove()`.

### 5.3 Storage Lifecycle (Zombie Prevention)

- **Problem**: Uploads that start but never update DB (Network failure, user abort) are not caught by `ON DELETE` triggers.
- **Configuration**: Supabase Storage Bucket Lifecycle.
  - **Rule**: `prefix: temp/` or `unconfirmed/` -> **Expire in 24h**.
  - **Flow**: Uploads go to `temp/` first. `confirmUpload` moves them to permanent path or renames.
  - _Simpler Alternative_: Bucket wide rule deleting files older than 24h _if not referenced_ (Complex).
  - **Adopted Strategy**: Application uploads to `staging/{uuid}`. Cron deletes `staging/*` older than 48h.

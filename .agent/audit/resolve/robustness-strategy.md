# Robustness & Reliability Strategy

**Objective**: Ensure system stability and data integrity under adverse conditions (network failure, race conditions, user abandonment).

## 1. Anti-Zombie Architecture (User Integrity)

To prevent creating `auth.users` rows without corresponding `public.profiles`:

- **Primary Mechanism**: **Transactional Server Action**.
  - All signups go through a Server Action that:
    1. Calls `supabase.auth.signUp()`.
    2. IMMEDIATELY calls a Postgres RPC function to create `organizations` and `profiles` in a single transaction block (or simulated transaction logic).
    3. If Step 2 fails, the Action attempts to rollback `auth.users` creation (deleteUser).
- **Secondary Safety Net**: **SQL Trigger**.
  - The `04-triggers.sql` logic acts as a fallback. It uses `INSERT IGNORE` or `ON CONFLICT DO NOTHING` logic if the Server Action already handled it, OR creates a skeleton profile if the Action crashed mid-flight.
  - **Self-Healing**: A "Login Guard" middleware checks for profile completeness on every session start. If `profile.org_id` is missing, it redirects to a `/fix-account` flow.

## 2. Network & Upload Reliability

### Signed URL Uploads (Guest Mode)

Guests (Clients) cannot use direct RLS insert permissions on Storage buckets effectively without Auth.
**Flow:**

1. Client requests "Upload Token" for file `X`.
2. Server verifies Case Token & Expiration.
3. Server generates **Resumable Signed URL** (TUS compatible if large file).
4. Client uploads to URL.
5. **Confirmation**: Client calls `confirmUpload()` action. Server verifies file existence in bucket before updating `case_files.status = 'uploaded'`.

### Retry Policies

All mutation requests (Saving changes, Uploading) must implement:

- **Exponential Backoff**: 500ms, 1000ms, 2000ms.
- **Max Retries**: 3 attempts.
- **Idempotency**: Requests should carry a unique `request_id` if sensible, to prevent double-execution on the server.

## 3. Data Consistency (Race Conditions)

- **Optimistic Locking**: Critical entities (Cases) will use a `version` number. Updates must match `version` or fail.
- **Soft Deletes**: Organizations are never hard-deleted immediately.
- **Invitation Validity**: Server-side check of `invitations.expires_at` BEFORE rendering the acceptance UI.

## 4. Error Taxonomy (Standardized)

| Error Code             | UX Message            | Action              |
| :--------------------- | :-------------------- | :------------------ |
| `AUTH_SESSION_EXPIRED` | "Tu sesión expiró."   | Redirect Login      |
| `PAYMENT_REQUIRED`     | "Función Premium."    | Update Plan Modal   |
| `CASE_CLOSED`          | "Expediente cerrado." | Read-Only Mode      |
| `UPLOAD_FAILED`        | "Error al subir."     | Auto-Retry / Manual |

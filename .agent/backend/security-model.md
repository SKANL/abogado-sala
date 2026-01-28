# Security Model (RLS) - Abogado Sala

Definición de políticas de acceso (Row Level Security).
**Default: Deny All.**

## 1. Helper Functions (Optimization & Plumbing)

To keep policies clean and fast. **Critical: Use JWT Claims to avoid RLS Recursion.**

```sql
-- Optimized: Reads from JWT app_metadata first (Zero DB Lookup)
create function auth.org_id() returns uuid as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'org_id')::uuid,
    (select org_id from public.profiles where id = auth.uid()), -- Fallback
    '00000000-0000-0000-0000-000000000000'::uuid
  )
$$ language sql security definer stable;

-- Verify Admin Status
create function auth.is_admin() returns boolean as $$
  select role = 'admin' from public.profiles where id = auth.uid()
$$ language sql security definer stable;
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
  - Lawyer: Permitido si tiene acceso al Case (RLS check).
  - **Portal (Client)**: **STRICTLY VIA SIGNED URL**.
    1. Client calls Server Action `generateUploadUrl(token, filename)`.
    2. Server validates Token + Expiration + File Type.
    3. Server returns Signed URL (scoped to specific file path).
    4. Client uploads directly to Storage.
    5. Client calls `confirmUpload()` to update DB state.
- **SELECT (Download)**:
  - Lawyer: Authenticated Users con acceso al Case (check DB).
  - **Portal (Client)**: Vía Server Action que genera Signed Download URL temporal (5 min).

### Lifecycle & Cleanup

- **Deletion**: Physical deletion is **Async**.
- DB Row deletion triggers insertion into `storage_delete_queue`.
- Cron Job handles physical cleanup (Security by Design: prevents transaction hangs on external S3 calls).
- **Zombie Prevention**: Bucket Lifecycle Rule deletes files in `staging/*` or `temp/*` older than 24h.

---

## 4. Auth Strategy (Anti-Zombie)

- **Primary**: Transactional Server Action (`signupWithOrg`).
- **Secondary**: SQL Trigger `handle_new_user` acts as fallback for Auth Providers (Google, etc) or direct API calls.
- **Middleware**: "Login Guard" checks `profile.org_id` existence.

---

## 5. Defense in Depth (Advanced)

### 5.1 Admin Safety (Anti-Coup Protection)

- **Problem**: Admin deletion leads to orphaned organizations.
- **Solution**: `BEFORE DELETE` Trigger on `profiles` table.
- **Logic**: Counts remaining Admins in the Org. If `<= 1`, raises Exception.
- **Implication**: Last Admin cannot self-destruct without promoting another Member or Deleting the Org first.

### 5.2 Quota Concurrency (The Quota Crusher)

- **Problem**: Parallel inserts bypassing `count(*)` checks.
- **Solution**: `pg_advisory_xact_lock` used in `check_org_quotas` trigger.
- **Effect**: Serializes INSERTs for the same Org, ensuring accurate limits.

### 5.3 Rate Limiting (Anti-Exfiltration)

- **Vector**: Bulk Case Download (Scripted).
- **Control**: Token Bucket Algorithm via SQL `check_rate_limit()`.
- **Policy**:
  - **Bulk Export**: 5GB / 10 mins per User.
  - **API Requests**: 100 req / min (via generic middleware or Supabase WAF).

### 5.4 Storage Quota Enforcement (The 5GB Wall)

- **Vector**: Race Condition in parallel uploads bypassing limits.
- **Solution**:
  - **Schema**: `organizations.storage_used` (BigInt) tracks filtered bytes.
  - **Trigger**: `update_storage_usage` runs on `INSERT/DELETE` of `case_files`.
  - **Locking**: Uses `pg_advisory_xact_lock('s' + org_id)` because updating a single row (`organizations`) naturally serializes transactions, but explicit locking documents intent and ensures safety if logic expands.
  - **Fail-Safe**: `BEFORE INSERT` checks limit vs `storage_used + new.size`.

### 5.5 Token Revocation (The Zombie Admin)

- **Problem**: Deleted Admin still has valid JWT for 1h.
- **Solution**:
  - **Banishment**: When `remove_org_member` is called, the system MUST call `supabase.auth.admin.banUser()` or `signOut()` via Server Action.
  - **Realtime**: Use `onAuthStateChange` to listen for 'SIGNED_OUT' events if implementing server-side session revocation list (advanced).
  - **Recommendation**: Accept short-lived "Read-Only" zombie risk (1h) or implement strict "Login Guard" middleware that re-validates user role on critical mutations.

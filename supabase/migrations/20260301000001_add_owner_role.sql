-- Migration: add_owner_role
-- Adds 'owner' as a first-class value in the user_role enum and updates
-- the helper functions so owners have full admin privileges plus an
-- exclusive is-owner check.
--
-- Changes:
--   1. ALTER TYPE user_role ADD VALUE 'owner'         — new enum value
--   2. Replace app_is_admin() to include 'owner'       — owners pass all admin gates
--   3. Add app_is_owner()                              — exclusive owner-only check
--   4. Add app_is_owner to Functions section comments  — documentation
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in
-- Postgres.  Supabase migrations run each file outside an explicit
-- transaction, so this is safe.  If you ever wrap this in BEGIN/COMMIT you
-- must move the ALTER TYPE before the BEGIN.

-- ── 1. Extend the enum ──────────────────────────────────────────────────────
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'owner';

-- ── 2. Re-create app_is_admin() to include 'owner' ──────────────────────────
-- Owners should pass every check that admins pass (billing, team management,
-- org settings, audit logs, etc.).  This is the single change that makes
-- owner ⊇ admin without touching any RLS policy.
CREATE OR REPLACE FUNCTION public.app_is_admin() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path = 'public'
    AS $$
declare
  _claims jsonb;
  _role   text;
begin
  _claims := current_setting('request.jwt.claims', true)::jsonb;
  _role   := _claims -> 'app_metadata' ->> 'role';

  -- Fast path: role is already in the JWT (no DB round-trip needed)
  if _role is not null then
    return _role in ('admin', 'owner');
  end if;

  -- Fallback: JWT hasn't been refreshed yet after signup / role change
  return exists (
    select 1
    from public.profiles
    where id   = auth.uid()
      and role in ('admin', 'owner')
  );
end;
$$;

-- ── 3. Add app_is_owner() ────────────────────────────────────────────────────
-- Use this only for operations that must be restricted to the org founder,
-- e.g., deleting the entire organisation, transferring ownership.
-- For everything else (team management, billing, settings) use app_is_admin().
CREATE OR REPLACE FUNCTION public.app_is_owner() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path = 'public'
    AS $$
declare
  _claims jsonb;
  _role   text;
begin
  _claims := current_setting('request.jwt.claims', true)::jsonb;
  _role   := _claims -> 'app_metadata' ->> 'role';

  if _role is not null then
    return _role = 'owner';
  end if;

  return exists (
    select 1
    from public.profiles
    where id   = auth.uid()
      and role = 'owner'
  );
end;
$$;

ALTER FUNCTION public.app_is_admin() OWNER TO postgres;
ALTER FUNCTION public.app_is_owner() OWNER TO postgres;

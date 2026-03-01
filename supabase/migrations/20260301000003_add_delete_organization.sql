-- Migration: add_delete_organization
-- Adds a SECURITY DEFINER function to fully delete an organisation and all
-- its data. Only the org 'owner' can invoke it.
--
-- Cascade map vs. organizations.id:
--   CASCADE  : cases → (portal_analytics), clients, invitations, jobs,
--              notifications, profiles, subscriptions
--   NO ACTION: audit_logs, case_files, templates   ← must be deleted manually
--
-- The existing per-row trigger `on_case_file_deleted` fires queue_storage_deletion()
-- for each case_file row deleted here, so storage cleanup is automatic.
--
-- Returns the UUIDs of every member that was removed so the caller (server action)
-- can delete those auth.users records via the admin API.

CREATE OR REPLACE FUNCTION public.delete_organization(p_org_id uuid)
RETURNS SETOF uuid          -- member user IDs  ← server action deletes auth.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- ── Guards ─────────────────────────────────────────────────────────────────
  IF NOT public.app_is_owner() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Only the organisation owner can delete it';
  END IF;

  IF p_org_id <> public.app_get_org_id() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: You do not belong to this organisation';
  END IF;

  IF NOT public.app_is_active() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Account is not active';
  END IF;

  -- ── Collect member UUIDs before any deletions ────────────────────────────
  -- profiles cascade-delete with the org, so we must read them first.
  RETURN QUERY
    SELECT id FROM public.profiles WHERE org_id = p_org_id;

  -- ── 1. audit_logs (no ON DELETE CASCADE from organizations) ─────────────
  DELETE FROM public.audit_logs WHERE org_id = p_org_id;

  -- ── 2. templates (no ON DELETE CASCADE from organizations) ──────────────
  DELETE FROM public.templates WHERE org_id = p_org_id;

  -- ── 3. case_files (no ON DELETE CASCADE from organizations) ─────────────
  -- Per-row trigger `on_case_file_deleted` fires queue_storage_deletion() for
  -- each deleted row → physical files are queued for async removal.
  DELETE FROM public.case_files WHERE org_id = p_org_id;

  -- ── 4. Delete the organisation — Postgres CASCADE handles the rest ───────
  --   cases → portal_analytics
  --   clients, invitations, jobs, notifications, profiles, subscriptions
  DELETE FROM public.organizations WHERE id = p_org_id;

END;
$$;

ALTER FUNCTION public.delete_organization(uuid) OWNER TO postgres;

-- Only authenticated users can call this; the function itself enforces owner-only.
REVOKE ALL ON FUNCTION public.delete_organization(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_organization(uuid) TO authenticated;

-- Migration: add_get_org_members_with_email
-- Adds a SECURITY DEFINER function that joins public.profiles with auth.users
-- so admins can see member email addresses without exposing auth.users directly.
--
-- Security notes:
--   1. search_path is pinned to 'public' to prevent search_path injection.
--   2. Caller org is validated via app_get_org_id() — cross-org queries return 0 rows.
--   3. Only admin/owner role can call this (app_is_admin()); member role access is denied.
--   4. DB user_role enum only has 'admin' | 'member'; 'owner' lives in JWT app_metadata only.

create or replace function public.get_org_members_with_email(p_org_id uuid)
returns table (
  id          uuid,
  full_name   text,
  avatar_url  text,
  role        text,
  status      text,
  email       text,
  created_at  timestamptz
)
language sql
security definer
stable
set search_path = 'public'
as $$
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.role::text,
    p.status::text,
    u.email,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.org_id = p_org_id
    -- Enforce: caller can only query their own org (mirrors all other RLS helpers)
    and p_org_id = public.app_get_org_id()
    -- Enforce: only admins/owners can retrieve emails
    and public.app_is_admin()
    -- Enforce: caller must be an active user
    and public.app_is_active()
  order by p.full_name;
$$;

-- Revoke from all, then grant only to authenticated (anon must never call this).
revoke all on function public.get_org_members_with_email(uuid) from public, anon;
grant execute on function public.get_org_members_with_email(uuid) to authenticated;

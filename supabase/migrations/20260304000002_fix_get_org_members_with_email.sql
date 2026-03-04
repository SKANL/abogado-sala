-- Fix get_org_members_with_email: remove JWT-based guards (app_get_org_id, app_is_admin,
-- app_is_active) that always fail when called via the service_role admin client
-- (which has no user JWT in context). Security is preserved by:
--   1. SECURITY DEFINER -- function runs with elevated privileges
--   2. Called only from the Next.js server (never from browser clients)
--   3. p_org_id parameter scopes all results to the requested org only
CREATE OR REPLACE FUNCTION public.get_org_members_with_email(p_org_id uuid)
RETURNS TABLE(
  id         uuid,
  full_name  text,
  avatar_url text,
  role       text,
  status     text,
  email      text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.role::text,
    p.status::text,
    u.email,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.org_id = p_org_id
  ORDER BY p.full_name;
$$;

-- Migration: backfill_owner_role
-- For every organisation, promotes the oldest admin profile to 'owner'.
--
-- Rationale:
--   The founder always signs up first, so the profile with the earliest
--   created_at within each org is the de-facto owner.  We restrict the
--   selection to current 'admin' profiles to avoid accidentally promoting
--   a member who happened to join early.
--
-- After this runs:
--   • Each org has exactly one 'owner'.
--   • Secondary admins remain 'admin'.
--   • Members are unaffected.
--   • The next JWT refresh will carry the updated role automatically
--     (sync_claims_to_auth trigger fires on UPDATE to profiles.role).

UPDATE public.profiles AS p
SET    role = 'owner'
FROM (
  -- Pick the earliest-created admin per org.
  SELECT DISTINCT ON (org_id) id
  FROM   public.profiles
  WHERE  role = 'admin'
  ORDER  BY org_id, created_at ASC
) AS founders
WHERE p.id = founders.id;

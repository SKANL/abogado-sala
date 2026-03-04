-- Fix deletion_requests FKs to reference public.profiles instead of auth.users
-- This allows PostgREST to auto-detect the join and enables eager loading of requester profiles.

ALTER TABLE public.deletion_requests
  DROP CONSTRAINT deletion_requests_requested_by_fkey,
  ADD CONSTRAINT deletion_requests_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.deletion_requests
  DROP CONSTRAINT IF EXISTS deletion_requests_reviewed_by_fkey,
  ADD CONSTRAINT deletion_requests_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

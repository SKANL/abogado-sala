-- Backfill Migration
-- Purpose: Force-sync existing profiles to auth.users metadata by touching them.
-- Triggers 'tr_sync_claims' which updates app_metadata.

update public.profiles
set updated_at = now()
where true;

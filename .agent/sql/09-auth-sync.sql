-- Professional Fix: Automatic Claim Syncing
-- Source of Truth: public.profiles
-- Target: auth.users.raw_app_metadata
-- Purpose: Ensures JWTs and getUser() calls always have fresh org_id/role claims

create or replace function public.sync_claims_to_auth()
returns trigger
language plpgsql
security definer
set search_path = public -- Secure search path
as $$
begin
  -- Update auth.users metadata when profile changes
  -- We preserve existing metadata keys and only overwrite org_id/role
  update auth.users
  set raw_app_metadata = 
    coalesce(raw_app_metadata, '{}'::jsonb) || 
    jsonb_build_object(
      'org_id', new.org_id,
      'role', new.role
    )
  where id = new.id;
  
  return new;
end;
$$;

-- Create Trigger (Idempotent)
drop trigger if exists tr_sync_claims on public.profiles;

create trigger tr_sync_claims
  after insert or update of org_id, role on public.profiles
  for each row execute procedure public.sync_claims_to_auth();

-- 04-triggers.sql
-- Automations and Triggers

-- 1. Function to handle new user registration
-- This assumes metadata contains 'full_name' and 'org_name' (if creating new org) or logic handled by Supabase Auth Actions.
-- Simpler approach: Create basic profile entry when auth.users row is created.

create or replace function public.handle_new_user() 
returns trigger 
language plpgsql 
security definer 
as $$
declare
  v_org_id uuid;
begin
  -- Logic:
  -- 1. If user is created with an Invitation, they join an existing Org.
  -- 2. If user is signing up independently, they create a new Org.
  
  -- Check for existing org invitation logic here (simplified for now: assume new org for every signup unless meta says otherwise)
  -- For this migration file, we will create a placeholder profile. 
  -- Real-world app usually handles Org creation via a specific Server Action, 
  -- so the Trigger might just ensure Profile exists or be skipped if handled manually.
  
  -- However, to satisfy "Auth Triggers" requirement:
  
  insert into public.profiles (id, org_id, role, full_name, avatar_url)
  values (
    new.id,
    (new.raw_user_meta_data->>'org_id')::uuid, -- Expecting org_id in metadata if invited
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'member'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  
  return new;
exception 
  when others then
    -- Fail safe: log error but don't block auth? Or block?
    -- Better to block to ensure data consistency.
    raise exception 'Failed to create profile: %', sqlerrm;
end;
$$;

-- 2. Bind Trigger
-- Uncomment if you want this to run automatically on every sign up.
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();

-- NOTE: In a robust B2B SaaS, Org creation is complex (Stripe, etc). 
-- Often better to handle via a Transactional Server Action (createAccountAction) rather than a simple trigger.
-- Leaving the function definition here but trigger commented for safety/manual control decision.

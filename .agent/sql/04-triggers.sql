-- 04-triggers.sql
-- Automations and Triggers for Integrity & Maintenance

-- 1. Auth: Handle New User (Profile Creation)
create or replace function public.handle_new_user() 
returns trigger 
language plpgsql 
security definer 
as $$
declare
  v_org_id uuid;
  v_role user_role := 'member';
begin
  -- Search for pending invitation via Email
  select org_id, role into v_org_id, v_role
  from public.invitations
  where email = new.email
  and status = 'pending'
  limit 1;

  -- If found, auto-accept (Business Logic could vary, but this ensures Profile validity)
  if v_org_id is not null then
      update public.invitations set status = 'accepted' where email = new.email;
  end if;

  -- Attempt Insert (If org_id is NULL and column is NOT NULL, this will fail)
  -- We rely on Exception catching to allow "Owner Flow" (Create Account -> Create Org -> Create Profile manually)
  insert into public.profiles (id, org_id, role, full_name, avatar_url)
  values (
    new.id,
    v_org_id, -- Might be NULL if no invite
    coalesce(v_role, 'member'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
exception 
  when not_null_violation then
    -- Expected for new Owners creating a fresh Org. 
    -- Server Action will handle Profile creation after Org creation.
    return new;
  when others then
    -- Log other errors but don't block auth
    return new;
end;
$$;

-- Note: Trigger usually enabled in production
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();


-- 2. Quota Enforcement: Prevent Plan Escalation (With Concurrency Locking)
create or replace function public.check_org_quotas()
returns trigger
language plpgsql
security definer
as $$
declare
  v_plan_tier plan_tier;
  v_count int;
  v_limit int;
  v_max_storage bigint;
  v_lock_key bigint;
begin
  -- Critical: Serialize inserts for this Org to prevent race conditions (The Quota Crusher)
  -- Use a Transactional Advisory Lock based on org_id
  -- Use hashtext to generate a stable bigint from the UUID string + prefix
  v_lock_key := hashtext('client_quota_' || new.org_id::text);
  perform pg_advisory_xact_lock(v_lock_key);

  -- Get Org Settings (Now from plan_configs table)
  select o.plan_tier, pc.max_clients
  into v_plan_tier, v_limit
  from organizations o
  left join plan_configs pc on o.plan_tier = pc.plan
  where o.id = new.org_id;
  
  -- Fallback if config missing (Critical Safety)
  if v_limit is null then v_limit := 5; end if;

  if TG_TABLE_NAME = 'clients' then
    select count(*) into v_count from clients where org_id = new.org_id;
    
    if v_count >= v_limit then
      raise exception 'Plan limit reached (% clients). Upgrade to add more.', v_limit;
    end if;
  end if;

  return new;
end;
$$;

-- Bind Quota Triggers
create trigger check_clients_quota
  before insert on clients
  for each row execute procedure public.check_org_quotas();

-- 2.1 Anti-Coup Protection: Prevent deleting the last Admin
create or replace function public.prevent_last_admin_delete()
returns trigger
language plpgsql
security definer
as $$
declare
  v_admin_count int;
begin
  if old.role = 'admin' then
    -- Check how many admins are left in this org
    select count(*) into v_admin_count 
    from public.profiles 
    where org_id = old.org_id and role = 'admin';

    -- If this was the last one (or only one), block deletion
    -- Note: check logic assumes current transaction hasn't committed delete yet (BEFORE trigger)
    if v_admin_count <= 1 then
      raise exception 'Integrity Error: Cannot delete the last Admin of the Organization.';
    end if;
  end if;
  return old;
end;
$$;

create trigger on_profile_delete_check
  before delete on profiles
  for each row execute procedure public.prevent_last_admin_delete();


-- 3. Storage GC: Async Clean up
create or replace function public.queue_storage_deletion()
returns trigger
language plpgsql
security definer
as $$
begin
  -- When a Case File is deleted from DB, queue it for physical deletion
  if old.file_key is not null then
    insert into storage_delete_queue (bucket_id, file_path)
    values ('secure-docs', old.file_key);
  end if;
  return old;
end;
$$;

-- Bind GC Trigger
-- Bind GC Trigger
create trigger on_case_file_deleted
  after delete on case_files
  for each row execute procedure public.queue_storage_deletion();

-- 4. Storage Quota Enforcement (Incremental + Locking)
create or replace function public.update_storage_usage()
returns trigger
language plpgsql
security definer
as $$
declare
  v_delta bigint;
  v_current_usage bigint;
  v_plan_tier plan_tier;
  v_limit bigint;
  v_lock_key bigint;
  v_org_id uuid;
begin
  if (TG_OP = 'INSERT') then
     v_delta := coalesce(new.file_size, 0);
     v_org_id := new.org_id;
  elsif (TG_OP = 'UPDATE') then
     v_delta := coalesce(new.file_size, 0) - coalesce(old.file_size, 0);
     v_org_id := new.org_id;
  elsif (TG_OP = 'DELETE') then
     v_delta := -coalesce(old.file_size, 0);
     v_org_id := old.org_id;
  end if;

  if v_delta = 0 then
    return null; -- After trigger, return ignored but null matches spec
  end if;

  -- Concurrency Lock for Storage Counter
  v_lock_key := hashtext('storage_quota_' || v_org_id::text);
  perform pg_advisory_xact_lock(v_lock_key);

  -- Update Counter
  update organizations 
  set storage_used = storage_used + v_delta
  where id = v_org_id
  returning storage_used, plan_tier into v_current_usage, v_plan_tier;

  -- Check Limit (On INSERT or UPDATE that increases size)
  if (v_delta > 0) then
    select max_storage_bytes into v_limit from plan_configs where plan = v_plan_tier;
    if v_limit is null then v_limit := 524288000; end if; -- 500MB Fallback

    if v_current_usage > v_limit then
      raise exception 'Storage Quota Exceeded. Used: %, Limit: %', v_current_usage, v_limit;
    end if;
  end if;

  return null;
end;
$$;

create trigger track_storage_usage
  after insert or update or delete on case_files
  for each row execute procedure public.update_storage_usage();

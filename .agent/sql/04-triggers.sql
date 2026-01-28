-- 04-triggers.sql
-- Automations and Triggers for Integrity & Maintenance

-- 1. Auth: Handle New User (Profile Creation)
create or replace function public.handle_new_user() 
returns trigger 
language plpgsql 
security definer 
as $$
begin
  insert into public.profiles (id, org_id, role, full_name, avatar_url)
  values (
    new.id,
    NULL, -- Org ID should be assigned via Invitation or onboarding flow
    'member',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
exception 
  when others then
    -- Log error but allow auth to proceed (app checks profile existence)
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
  v_lock_key bigint;
begin
  -- Critical: Serialize inserts for this Org to prevent race conditions (The Quota Crusher)
  -- Use a Transactional Advisory Lock based on org_id
  -- We cast UUID to bigint (taking first 8 bytes implies minimal collision risk for this purpose, or hash it)
  v_lock_key := ('x' || substr(new.org_id::text, 1, 8))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  -- Get Org Plan Tier
  select plan_tier into v_plan_tier from organizations where id = new.org_id;

  -- Define Limits (Should map to a proper Config Table in Production)
  if TG_TABLE_NAME = 'clients' then
    v_limit := case v_plan_tier 
      when 'trial' then 10 
      when 'pro' then 1000 
      else 5 
    end;
    
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
  v_file_size bigint; -- Assumes user metadata or extra column has size
begin
  -- Note: Ideally 'case_files' has a 'file_size' column. Assuming it does or we extract from metadata.
  -- For this example, we assume we added 'file_size' to case_files (or use a default avg).
  -- Let's assume there is a 'file_size' column. If not added yet, we should add it to tables.sql.
  -- Fallback to 0 if null.
  
  if (TG_OP = 'INSERT') then
     v_delta := coalesce(new.file_size, 0);
  elsif (TG_OP = 'UPDATE') then
     -- Calculate difference (e.g. 0 -> 10MB, or 10MB -> 5MB)
     v_delta := coalesce(new.file_size, 0) - coalesce(old.file_size, 0);
  elsif (TG_OP = 'DELETE') then
     v_delta := -coalesce(old.file_size, 0);
  end if;

  if v_delta = 0 then
    return new;
  end if;

  -- Concurrency Lock for Storage Counter
  v_lock_key := ('s' || substr(coalesce(new.org_id, old.org_id)::text, 1, 8))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  -- Update Counter
  update organizations 
  set storage_used = storage_used + v_delta
  where id = coalesce(new.org_id, old.org_id)
  returning storage_used, plan_tier into v_current_usage, v_plan_tier;

  -- Check Limit (On INSERT or UPDATE that increases size)
  if (v_delta > 0) then
    v_limit := case v_plan_tier 
      when 'trial' then 524288000 -- 500MB
      when 'pro' then 53687091200 -- 50GB
      else 5242880000 -- 5GB (fallback)
    end;

    if v_current_usage > v_limit then
      raise exception 'Storage Quota Exceeded. Used: %, Limit: %', v_current_usage, v_limit;
    end if;
  end if;

  return new;
end;
$$;

create trigger track_storage_usage
  after insert or update or delete on case_files
  for each row execute procedure public.update_storage_usage();

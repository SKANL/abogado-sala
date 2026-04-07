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
  for update  -- Lock row to prevent concurrent acceptance
  limit 1;

  -- If found, auto-accept (atomic update with status check)
  if v_org_id is not null then
      update public.invitations 
      set status = 'accepted' 
      where email = new.email 
      and status = 'pending';  -- Double-check status hasn't changed
      
      if not found then
        -- Another concurrent signup already accepted
        v_org_id := null;
        v_role := 'member';
      end if;
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
  v_plan_status plan_status;
  v_count int;
  v_limit int;
  v_max_storage bigint;
  v_lock_key bigint;
  v_trial_ends_at timestamptz;
begin
  -- Critical: Serialize inserts for this Org to prevent race conditions (The Quota Crusher)
  -- Use a Transactional Advisory Lock based on org_id
  -- Use hashtext to generate a stable bigint from the UUID string + prefix
  v_lock_key := hashtext('client_quota_' || new.org_id::text);
  perform pg_advisory_xact_lock(v_lock_key);

  -- Get Org Settings (Now from plan_configs table)
  select o.plan_tier, o.plan_status, o.trial_ends_at, pc.max_clients
  into v_plan_tier, v_plan_status, v_trial_ends_at, v_limit
  from organizations o
  left join plan_configs pc on o.plan_tier = pc.plan
  where o.id = new.org_id;

  -- 1. Enforce Plan Status & Trial Expiration
  if v_plan_status = 'trialing' and v_trial_ends_at < now() then
      raise exception 'Organization trial has expired.';
  end if;

  if v_plan_status not in ('active', 'trialing') then
      raise exception 'Organization subscription is not active.';
  end if;
  
  -- Fallback if config missing (Critical Safety)
  if v_limit is null then v_limit := 5; end if;

  if TG_TABLE_NAME = 'clients' then
    select count(*) into v_count from clients where org_id = new.org_id;
    
    if v_count >= v_limit then
      raise exception using
        errcode = 'BLQCL',
        message = 'BILLING_QUOTA_CLIENTS';
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
      raise exception using
        errcode = 'INTEG',
        message = 'AUTH_LAST_ADMIN';
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
  v_plan_status plan_status;
  v_limit bigint;
  v_lock_key bigint;
  v_org_id uuid;
  v_trial_ends_at timestamptz;
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
  returning storage_used, plan_tier, plan_status, trial_ends_at into v_current_usage, v_plan_tier, v_plan_status, v_trial_ends_at;

  -- Check Limit (On INSERT or UPDATE that increases size)
  -- Check Limit (On INSERT or UPDATE that increases size)
  if (v_delta > 0) then
    -- 1. Hard Block for Inactive Plans (Stop Revenue Leak)
    if v_plan_status = 'trialing' and v_trial_ends_at < now() then
      raise exception using
        errcode = 'BLQUS', -- Custom code for "Billing Status"
        message = 'BILLING_TRIAL_EXPIRED';
    end if;

    if v_plan_status not in ('active', 'trialing') then
      raise exception using
        errcode = 'BLQUS', -- Custom code for "Billing Status"
        message = 'BILLING_SUBSCRIPTION_INACTIVE';
    end if;

    -- 2. Check Storage Limit
    select max_storage_bytes into v_limit from plan_configs where plan = v_plan_tier;
    if v_limit is null then v_limit := 524288000; end if; -- 500MB Fallback

    if v_current_usage > v_limit then
      raise exception using
        errcode = 'BLQST',
        message = 'BILLING_QUOTA_STORAGE';
    end if;
  end if;

  return null;
end;
$$;

create trigger tr_track_storage_usage
  after insert or update of file_size or delete on case_files
  for each row execute procedure public.update_storage_usage();


-- 4.1 Universal Billing Guard (Prevention)
-- Blocks creation of critical resources if subscription is inactive
create or replace function public.ensure_active_subscription()
returns trigger
language plpgsql
security definer
as $$
declare
  v_status plan_status;
  v_trial_ends_at timestamptz;
begin
  select plan_status, trial_ends_at into v_status, v_trial_ends_at from organizations where id = new.org_id;
  
  if v_status = 'trialing' and v_trial_ends_at < now() then
      raise exception using
        errcode = 'BLQUS',
        message = 'BILLING_TRIAL_EXPIRED';
  end if;

  if v_status not in ('active', 'trialing') then
      raise exception using
        errcode = 'BLQUS',
        message = 'BILLING_SUBSCRIPTION_INACTIVE';
  end if;
  return new;
end;
$$;

-- Bind Billing Guard to Cases & Invitations
create trigger check_billing_cases
  before insert on cases
  for each row execute procedure public.ensure_active_subscription();

create trigger check_billing_invitations
  before insert on invitations
  for each row execute procedure public.ensure_active_subscription();

-- 4.2 Cross-Org Integrity Guard (Anti-Trojan)
-- Prevents assigning a lawyer from a different organization
create or replace function public.check_lawyer_org_match()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.assigned_lawyer_id is not null then
    perform 1 from profiles
    where id = new.assigned_lawyer_id
    and org_id = new.org_id;
    
    if not found then
      raise exception 'Integrity Violation: Assigned lawyer must belong to the same organization';
    end if;
  end if;
  return new;
end;
$$;

create trigger tr_check_lawyer_org
  before insert or update of assigned_lawyer_id, org_id on clients
  for each row execute procedure public.check_lawyer_org_match();

-- 8. Universal Audit Logger
-- Captures INSERT/UPDATE/DELETE on critical tables
create or replace function public.log_activity() returns trigger as $$
begin
  insert into audit_logs (org_id, actor_id, action, target_id, metadata)
  values (
    COALESCE(new.org_id, old.org_id),
    auth.uid(), -- approximate actor (or null if system)
    TG_TABLE_NAME || '_' || TG_OP,
    COALESCE(new.id, old.id),
    jsonb_build_object(
      'old', row_to_json(old), 
      'new', row_to_json(new),
      'triggered_by', current_user
    )
  );
  return null;
end;
$$ language plpgsql security definer;

-- 9. Sync Subscription Status to Organization
-- Ensures org plan_status always matches subscription status
create or replace function public.sync_subscription_status() returns trigger as $$
begin
  -- Map Subscription Status to Plan Status
  -- active/trialing -> active
  -- past_due/unpaid -> past_due
  -- canceled/incomplete_expired -> canceled
  update organizations 
  set plan_status = case 
    when new.status = 'active' then 'active'::plan_status
    when new.status = 'trialing' then 'trialing'::plan_status
    when new.status in ('past_due', 'unpaid') then 'past_due'::plan_status
    else 'canceled'::plan_status
  end,
  updated_at = now()
  where id = new.org_id;
  
  return new;
end;
$$ language plpgsql security definer;

-- EXTRA TRIGGERS (Audit & Sync)

create trigger tr_audit_case_files
  after insert or update or delete on case_files
  for each row execute function log_activity();

create trigger tr_audit_cases
  after insert or update or delete on cases
  for each row execute function log_activity();

create trigger tr_audit_invitations
  after insert or update or delete on invitations
  for each row execute function log_activity();

create trigger tr_sync_subscription_org
  after insert or update of status on subscriptions
  for each row execute function sync_subscription_status();

-- Extended Audit Triggers (Senior Architect Recommendation)
create trigger tr_audit_profiles
  after insert or update of role, full_name or delete on profiles
  for each row execute function log_activity();

create trigger tr_audit_clients
  after insert or update or delete on clients
  for each row execute function log_activity();

create trigger tr_audit_organizations
  after update on organizations
  for each row execute function log_activity();

-- 23-safety-patches.sql
-- Description: Refactor critical triggers to safely handle tables without 'org_id'.
-- This prevents crashes if these triggers are accidentally attached to system tables (like storage.objects).

-- 1. Safe Quota Check
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
  v_org_id uuid;
  v_new_json jsonb;
begin
  -- SAFE EXTRACTION: Get org_id from JSON to avoid "column does not exist" error
  v_new_json := row_to_json(new);
  
  if v_new_json ? 'org_id' then
    v_org_id := (v_new_json->>'org_id')::uuid;
  else
    -- Column missing? This trigger shouldn't be running here. Gracefully exit.
    return new;
  end if;

  if v_org_id is null then
    return new;
  end if;

  -- Critical: Serialize inserts for this Org to prevent race conditions (The Quota Crusher)
  v_lock_key := hashtext('client_quota_' || v_org_id::text);
  perform pg_advisory_xact_lock(v_lock_key);

  -- Get Org Settings
  select o.plan_tier, o.plan_status, o.trial_ends_at, pc.max_clients
  into v_plan_tier, v_plan_status, v_trial_ends_at, v_limit
  from organizations o
  left join plan_configs pc on o.plan_tier = pc.plan
  where o.id = v_org_id;

  -- 1. Enforce Plan Status & Trial Expiration
  if v_plan_status = 'trialing' and v_trial_ends_at < now() then
      raise exception 'Organization trial has expired.';
  end if;

  if v_plan_status not in ('active', 'trialing') then
      raise exception 'Organization subscription is not active.';
  end if;
  
  -- Fallback if config missing
  if v_limit is null then v_limit := 5; end if;

  if TG_TABLE_NAME = 'clients' then
    select count(*) into v_count from clients where org_id = v_org_id;
    
    if v_count >= v_limit then
      raise exception using
        errcode = 'BLQCL',
        message = 'BILLING_QUOTA_CLIENTS';
    end if;
  end if;

  return new;
end;
$$;


-- 2. Safe Storage Usage Tracking
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
  v_new_json jsonb;
  v_old_json jsonb;
begin
  -- SAFE EXTRACTION
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
     v_new_json := row_to_json(new);
     if not (v_new_json ? 'org_id') then return null; end if; -- Safely exit
  end if;
  
  if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') then
     v_old_json := row_to_json(old);
     if not (v_old_json ? 'org_id') then return null; end if; -- Safely exit
  end if;

  if (TG_OP = 'INSERT') then
     v_delta := coalesce((v_new_json->>'file_size')::bigint, 0);
     v_org_id := (v_new_json->>'org_id')::uuid;
  elsif (TG_OP = 'UPDATE') then
     v_delta := coalesce((v_new_json->>'file_size')::bigint, 0) - coalesce((v_old_json->>'file_size')::bigint, 0);
     v_org_id := (v_new_json->>'org_id')::uuid;
  elsif (TG_OP = 'DELETE') then
     v_delta := -coalesce((v_old_json->>'file_size')::bigint, 0);
     v_org_id := (v_old_json->>'org_id')::uuid;
  end if;

  if v_delta = 0 then
    return null;
  end if;
  
  if v_org_id is null then
    return null;
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
  if (v_delta > 0) then
    -- 1. Hard Block for Inactive Plans
    if v_plan_status = 'trialing' and v_trial_ends_at < now() then
      raise exception using
        errcode = 'BLQUS',
        message = 'BILLING_TRIAL_EXPIRED';
    end if;

    if v_plan_status not in ('active', 'trialing') then
      raise exception using
        errcode = 'BLQUS',
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


-- 3. Safe Audit Logging
create or replace function public.log_activity() returns trigger as $$
declare
  v_new_json jsonb;
  v_old_json jsonb;
  v_org_id uuid;
  v_record_id uuid;
begin
  -- Safely extract org_id
  v_new_json := null;
  v_old_json := null;

  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    v_new_json := row_to_json(new);
  end if;
  
  if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') then
    v_old_json := row_to_json(old);
  end if;
  
  -- Try to get org_id from NEW, then OLD
  if v_new_json ? 'org_id' then
     v_org_id := (v_new_json->>'org_id')::uuid;
  elsif v_old_json ? 'org_id' then
     v_org_id := (v_old_json->>'org_id')::uuid;
  else
     -- No org_id found on this table? It might be global or system.
     -- We won't crash, we'll just log with NULL org_id if that's acceptable, 
     -- or if the table REALLY should have org_id but doesn't, we skip.
     -- For now, let's allow null org_id logging but safely.
     v_org_id := null;
  end if;

  -- Try to get ID
  if v_new_json ? 'id' then
     v_record_id := (v_new_json->>'id')::uuid;
  elsif v_old_json ? 'id' then
     v_record_id := (v_old_json->>'id')::uuid;
  end if;


  insert into audit_logs (org_id, actor_id, action, target_id, metadata)
  values (
    v_org_id,
    auth.uid(), -- approximate actor
    TG_TABLE_NAME || '_' || TG_OP,
    v_record_id,
    jsonb_build_object(
      'old', v_old_json, 
      'new', v_new_json,
      'triggered_by', current_user
    )
  );
  return null;
end;
$$ language plpgsql security definer;

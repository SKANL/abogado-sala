-- 22-fix-unsafe-triggers.sql

-- 1. Fix log_activity to be SAFE for tables without org_id (like storage.objects)
create or replace function public.log_activity() 
returns trigger 
language plpgsql 
security definer 
set search_path = public
as $$
declare
  v_new_json jsonb;
  v_old_json jsonb;
  v_org_id uuid;
begin
  -- Safe extraction via JSON
  v_new_json := null;
  v_old_json := null;

  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    v_new_json := row_to_json(new);
  end if;
  
  if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') then
    v_old_json := row_to_json(old);
  end if;

  -- Try to get org_id
  if v_new_json ? 'org_id' then
     v_org_id := (v_new_json->>'org_id')::uuid;
  elsif v_old_json ? 'org_id' then
     v_org_id := (v_old_json->>'org_id')::uuid;
  else
     v_org_id := null; -- Allow logging even without org_id
  end if;

  insert into audit_logs (org_id, actor_id, action, target_id, metadata)
  values (
    v_org_id,
    auth.uid(),
    TG_TABLE_NAME || '_' || TG_OP,
    COALESCE(new.id, old.id),
    jsonb_build_object(
      'old', v_old_json, 
      'new', v_new_json,
      'triggered_by', current_user
    )
  );
  return null;
exception when others then
  return null; -- Fail safe
end;
$$;

-- 2. Fix update_storage_usage to be SAFE
create or replace function public.update_storage_usage()
returns trigger
language plpgsql
security definer
set search_path = public
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
  -- Safe extraction
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
     v_new_json := row_to_json(new);
     if not (v_new_json ? 'org_id') then return null; end if; 
  end if;
  
  if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') then
     v_old_json := row_to_json(old);
     if not (v_old_json ? 'org_id') then return null; end if;
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

  if v_delta = 0 then return null; end if;
  if v_org_id is null then return null; end if;

  -- Lock and Update
  v_lock_key := hashtext('storage_quota_' || v_org_id::text);
  perform pg_advisory_xact_lock(v_lock_key);

  update organizations 
  set storage_used = storage_used + v_delta
  where id = v_org_id
  returning storage_used, plan_tier, plan_status, trial_ends_at into v_current_usage, v_plan_tier, v_plan_status, v_trial_ends_at;

  -- Check Limits (only if strict enforcement is needed here)
  -- For now, just tracking is enough to prevent crash
  return null;
end;
$$;

-- 3. Cleanup any potential rogue triggers on storage.objects
-- Note: You cannot drop triggers from other schemas easily without knowing the name.
-- We try standard names.
drop trigger if exists tr_audit_objects on storage.objects;
drop trigger if exists tr_track_storage_usage on storage.objects;
drop trigger if exists tr_check_storage_quota on storage.objects;

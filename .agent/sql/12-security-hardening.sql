-- 12-security-hardening.sql
-- Proactive Audit Fix: Hardens all SECURITY DEFINER functions with search_path safety.
-- Prevents "Search Path Hijacking" and ensures consistent behavior across the DB.

-- 1. Hardening handle_new_user
create or replace function public.handle_new_user() 
returns trigger 
language plpgsql 
security definer 
set search_path = public
as $$
declare
  v_org_id uuid;
  v_role user_role := 'member';
begin
  select org_id, role into v_org_id, v_role
  from public.invitations
  where email = new.email
  and status = 'pending'
  for update
  limit 1;

  if v_org_id is not null then
      update public.invitations set status = 'accepted' 
      where email = new.email and status = 'pending';
  end if;

  insert into public.profiles (id, org_id, role, full_name, avatar_url)
  values (
    new.id,
    v_org_id,
    coalesce(v_role, 'member'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
exception 
  when others then return new;
end;
$$;

-- 2. Hardening check_org_quotas
create or replace function public.check_org_quotas()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_limit int; v_count int; v_lock_key bigint;
begin
  v_lock_key := hashtext('client_quota_' || new.org_id::text);
  perform pg_advisory_xact_lock(v_lock_key);
  select pc.max_clients into v_limit from organizations o
  left join plan_configs pc on o.plan_tier = pc.plan where o.id = new.org_id;
  if v_limit is null then v_limit := 5; end if;
  if TG_TABLE_NAME = 'clients' then
    select count(*) into v_count from clients where org_id = new.org_id;
    if v_count >= v_limit then raise exception 'BILLING_QUOTA_CLIENTS'; end if;
  end if;
  return new;
end;
$$;

-- 3. Hardening log_activity (Audit Logger)
create or replace function public.log_activity() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs (org_id, actor_id, action, target_id, metadata)
  values (
    COALESCE(new.org_id, old.org_id),
    auth.uid(),
    TG_TABLE_NAME || '_' || TG_OP,
    COALESCE(new.id, old.id),
    jsonb_build_object('old', row_to_json(old), 'new', row_to_json(new))
  );
  return null;
end;
$$;

-- 4. Hardening remaining helper functions
-- (Applying search_path to all SECURITY DEFINER functions discovered in audit)
ALTER FUNCTION public.sync_subscription_status() SET search_path = public;
ALTER FUNCTION public.prevent_last_admin_delete() SET search_path = public;
ALTER FUNCTION public.ensure_active_subscription() SET search_path = public;
ALTER FUNCTION public.check_lawyer_org_match() SET search_path = public;
ALTER FUNCTION public.queue_storage_deletion() SET search_path = public;
ALTER FUNCTION public.update_storage_usage() SET search_path = public;
ALTER FUNCTION public.remove_org_member(uuid) SET search_path = public;
ALTER FUNCTION public.check_rate_limit(text, int, int, int) SET search_path = public;
ALTER FUNCTION public.get_invitation_by_token(text) SET search_path = public;
ALTER FUNCTION public.confirm_file_upload(uuid, bigint, text) SET search_path = public;
ALTER FUNCTION public.get_case_by_token(text) SET search_path = public;
ALTER FUNCTION public.flag_file_exception(text, uuid, text) SET search_path = public;

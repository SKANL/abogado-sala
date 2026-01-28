-- 07-stability-patches.sql
-- Stability Audit Fixes: "Ironclad" Protocol
-- 1. Soft Delete for Members
-- 2. Hardened RPCs

-- Patch 1: Safe Member Removal (Soft Delete)
-- Replaces the Dangerous DELETE with a SUSPEND update.
-- Integrity: Preserves "Created By" logs and "Assigned Lawyer" history.
create or replace function public.remove_org_member(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_requester_org uuid;
  v_target_org uuid;
  v_target_role user_role;
  v_admin_count int;
begin
  -- 1. Check Requester Permissions
  select org_id into v_requester_org from public.profiles where id = auth.uid();
  
  if not auth.is_admin() then
    raise exception 'Access Denied: Only Admins can remove members.';
  end if;

  if not auth.is_active() then
     raise exception 'Access Denied: User is suspended.';
  end if;

  -- 2. Check Target Context
  select org_id, role into v_target_org, v_target_role from public.profiles where id = target_user_id;
  
  if v_target_org is null or v_target_org <> v_requester_org then
    raise exception 'Target user not found in your organization.';
  end if;

  -- 3. The "Min 1 Admin" Rule
  if v_target_role = 'admin' then
    select count(*) into v_admin_count 
    from public.profiles 
    where org_id = v_requester_org and role = 'admin' and status = 'active'; 

    if v_admin_count <= 1 then
      raise exception 'Constraint Violation: Cannot remove the last Admin of the organization.';
    end if;
  end if;

  -- 4. Execute Soft Delete
  -- We set status to 'suspended'. 
  -- The auth.is_active() function will return FALSE for this user.
  -- All RLS policies require auth.is_active() = TRUE, so they effectively lose all access.
  update public.profiles 
  set status = 'suspended', updated_at = now()
  where id = target_user_id;

end;
$$;

-- Patch 2: Hardened Case Progress Update
-- Prevents negative steps or invalid state corruption
create or replace function public.update_case_progress(
  p_token text,
  p_step_index int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
begin
  -- VALIDATION: Sanity Check
  if p_step_index < 0 then
    raise exception 'Invalid Step Index: Cannot be negative';
  end if;

  select id into v_case_id from public.cases where token = p_token and expires_at > now();
  
  if v_case_id is null then exit; end if; -- Silent fail for progress update if expired

  update public.cases
  set current_step_index = p_step_index, updated_at = now()
  where id = v_case_id;
end;
$$;

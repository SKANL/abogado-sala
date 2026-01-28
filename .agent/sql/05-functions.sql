-- 05-functions.sql
-- Protected RPCs and Rate Limiting Infrastructure

-- 1. Admin Safety: Safe Member Removal (Anti-Coup)
-- Prevents leaving an Organization without an Admin.
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

  -- 1b. Check Active Status (Deep Defense)
  -- Uses security definer function to avoid RLS lookup issues
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
    where org_id = v_requester_org and role = 'admin';

    if v_admin_count <= 1 then
      raise exception 'Constraint Violation: Cannot remove the last Admin of the organization.';
    end if;
  end if;

  -- 4. Execute Removal (Soft Delete or Hard Delete via Auth)
  -- Option A: Delete from public.profiles (Cascades if configured, or leaves auth orphan)
  -- Option B: Delete from auth.users (Requires superuser/admin privileges, usually done via Supabase Admin API)
  
  -- For this DB function, we delete the Profile. 
  -- The Application Layer SHOULD also call supabase.auth.admin.deleteUser() if hard delete is desired.
  delete from public.profiles where id = target_user_id;

end;
$$;

-- 2. Rate Limiting Infrastructure (Token Bucket)
-- Simple table to track usage quotas for sensitive actions (exports, bulk reads).

create table if not exists public.rate_limits (
  key text primary key, -- e.g., 'download:user_id:123'
  tokens int not null,
  last_refill timestamptz not null default now()
);

alter table public.rate_limits enable row level security;

-- Rate Limit Check Function
-- Returns TRUE if allowed, FALSE if limit exceeded.
-- Auto-refills tokens based on time passed.
create or replace function public.check_rate_limit(
  p_key text,
  p_capacity int,
  p_refill_rate_per_second int,
  p_cost int
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_tokens int;
  v_last_refill timestamptz;
  v_now timestamptz := now();
  v_seconds_passed numeric;
  v_new_tokens int;
begin
  -- Lock or specific row
  select tokens, last_refill into v_tokens, v_last_refill
  from public.rate_limits
  where key = p_key
  for update;

  if not found then
    -- Initialize
    v_tokens := p_capacity;
    v_last_refill := v_now;
    insert into public.rate_limits (key, tokens, last_refill)
    values (p_key, v_tokens, v_last_refill);
  end if;

  -- Refill
  v_seconds_passed := extract(epoch from (v_now - v_last_refill));
  v_new_tokens := floor(v_seconds_passed * p_refill_rate_per_second)::int;
  
  if v_new_tokens > 0 then
    v_tokens := least(v_tokens + v_new_tokens, p_capacity);
    v_last_refill := v_now;
  end if;

  -- Consume
  if v_tokens >= p_cost then
    update public.rate_limits 
    set tokens = v_tokens - p_cost, last_refill = v_last_refill
    where key = p_key;
    return true;
  else
    return false;
  end if;
end;
$$;

-- 3. Public RPC: Get Invitation by Token (Security Hole Fix Round 9)
-- Allows a guest (unauthenticated) to validate a token and see basic info.
create or replace function public.get_invitation_by_token(p_token text)
returns table (
  email text,
  org_name text,
  role user_role,
  status invitation_status
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    i.email, 
    o.name as org_name, 
    i.role, 
    i.status
  from public.invitations i
  join public.organizations o on o.id = i.org_id
  where i.token = p_token
  and i.status = 'pending'  -- Fix: Only allow pending invitations
  and i.expires_at > now();
end;
$$;

-- 4. Transactional File Upload Confirmation
-- Called by confirmUploadAction after successful storage upload
-- Validates ownership and updates file status atomically
create or replace function public.confirm_file_upload(
  p_file_id uuid,
  p_file_size bigint,
  p_file_key text
)
returns public.case_files
language plpgsql
security definer
as $$
declare
  v_file public.case_files;
  v_org_id uuid;
begin
  -- VALIDATION: Prevent negative sizes and empty keys
  if p_file_size <= 0 then
    raise exception 'Invalid file size: must be positive';
  end if;
  
  if p_file_key is null or length(trim(p_file_key)) = 0 then
    raise exception 'Invalid file key: cannot be empty';
  end if;

  -- 1. Get file and verify ownership via RLS context
  select cf.*, c.org_id into v_file, v_org_id
  from public.case_files cf
  join public.cases c on c.id = cf.case_id
  where cf.id = p_file_id
  and c.org_id = auth.org_id()
  and (
    auth.is_admin()
    or exists (
      select 1 from public.clients cl
      where cl.id = c.client_id
      and cl.assigned_lawyer_id = auth.uid()
    )
  )
  and auth.is_active(); -- Fix: Enforce Soft Delete in RPC

  if v_file is null then
    raise exception 'File not found or access denied';
  end if;

  -- 2. Update file status and metadata
  update public.case_files
  set 
    status = 'uploaded',
    file_size = p_file_size,
    file_key = p_file_key,
    updated_at = now()
  where id = p_file_id
  returning * into v_file;

  return v_file;
end;
$$;

-- Security Hardening: Revoke public execution, restrict to service_role (Backend)
-- This prevents users from calling this RPC directly with fake file sizes.
revoke execute on function public.confirm_file_upload(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.confirm_file_upload(uuid, bigint, text) to service_role;

-- 5. Get Invitation Details (For Authenticated Admins)
-- Called by getInvitationAction to validate invitation tokens
-- Uses RLS to ensure org_id matches
create or replace function public.get_invitation(p_token text)
returns table (
  id uuid,
  email text,
  role user_role,
  status invitation_status,
  expires_at timestamptz
)
language plpgsql
security invoker  -- Uses RLS policies
as $$
begin
  return query
  select 
    i.id,
    i.email,
    i.role,
    i.status,
    i.expires_at
  from public.invitations i
  where i.token = p_token;
  -- RLS ensures org_id = auth.org_id() and auth.is_admin()
end;
$$;

-- 7. Security: Regenerate Case Token (Rotation) (Restored from Audit V1)
create or replace function public.regenerate_case_token(p_case_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_token text;
begin
  -- Check Permissions (Same as Access Policy)
  if not exists (
    select 1 from public.cases c
    where c.id = p_case_id
    and (
      (auth.is_admin() and c.org_id = auth.org_id())
      or exists (
        select 1 from public.clients cl
        where cl.id = c.client_id
        and cl.assigned_lawyer_id = auth.uid()
      )
    )
    and auth.is_active() -- Fix: Enforce Soft Delete in RPC
  ) then
    raise exception 'Access Denied or Case Not Found';
  end if;

  v_new_token := encode(gen_random_bytes(32), 'hex');

  update public.cases
  set token = v_new_token, updated_at = now()
  where id = p_case_id;

  return v_new_token;
end;
$$;

-- 8. Client Portal: Log Analytics (Anonymous Access)
-- Bypasses RLS to allow anonymous users to log events (e.g., "Page View", "Step Completed")
create or replace function public.log_portal_access(
  p_case_token text,
  p_event_type text,
  p_step_index int default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
begin
  select id into v_case_id from public.cases where token = p_case_token;
  
  if v_case_id is null then
    return; -- Security: Silent failure
  end if;

  insert into public.portal_analytics (
    case_id, 
    event_type, 
    step_index, 
    metadata,
    user_agent
  )
  values (
    v_case_id, 
    p_event_type, 
    p_step_index, 
    p_metadata,
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
end;
$$;

-- 9. Portal: Get Case Context by Token (Zero-Auth)
-- Returns the Case + relevant Files in a single JSON to avoid RLS complexity
create or replace function public.get_case_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.cases;
  v_client_name text;
  v_files jsonb;
begin
  -- 1. Fetch Case
  select * into v_case from public.cases where token = p_token;
  
  if v_case is null then
    raise exception 'Case not found or invalid token';
  end if;

  -- 2. Verify Expiration
  if v_case.expires_at < now() then
    raise exception 'Link expired';
  end if;

  -- 3. Fetch Client Name (Privacy: Only First Name?) taking full name for now as per design
  select full_name into v_client_name from public.clients where id = v_case.client_id;

  -- 4. Fetch Files
  select jsonb_agg(jsonb_build_object(
    'id', cf.id,
    'category', cf.category,
    'status', cf.status,
    'exception_reason', cf.exception_reason
  )) into v_files
  from public.case_files cf
  where cf.case_id = v_case.id;

  -- 5. Construct Response
  return jsonb_build_object(
    'case', row_to_json(v_case),
    'client_name', v_client_name,
    'files', coalesce(v_files, '[]'::jsonb)
  );
end;
$$;

-- 10. Portal: Flag File Exception (User doesn't have document)
create or replace function public.flag_file_exception(
  p_token text, 
  p_file_id uuid, 
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
begin
  -- 1. Resolve Case from Token
  select id into v_case_id from public.cases where token = p_token and expires_at > now();
  
  if v_case_id is null then
    raise exception 'Invalid or Expired Link';
  end if;

  -- 2. Update File Status
  update public.case_files
  set 
    status = 'pending', -- Remains pending but flagged? Or 'error'? Design says 'pending' with reason or 'exception'.
    -- Design says: "Missing (Exception): Naranja/Amarillo". File status enum has 'pending', 'uploaded', 'error'.
    -- We'll use 'error' to signify "Issue/Exception" to the lawyer, or keep 'pending' with non-null exception_reason.
    -- Let's use 'pending' + reason as "Exception state".
    exception_reason = p_reason,
    updated_at = now()
  where id = p_file_id 
  and case_id = v_case_id;
end;
$$;

-- 11. Portal: Update Progress (Step Tracking)
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
  select id into v_case_id from public.cases where token = p_token and expires_at > now();
  
  if v_case_id is null then exit; end if; -- Silent fail for progress update

  update public.cases
  set current_step_index = p_step_index, updated_at = now()
  where id = v_case_id;
end;
$$;

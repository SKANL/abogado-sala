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
  v_target_role app_role;
  v_admin_count int;
begin
  -- 1. Check Requester Permissions
  select org_id into v_requester_org from public.profiles where id = auth.uid();
  
  if not public.auth.is_admin() then
    raise exception 'Access Denied: Only Admins can remove members.';
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

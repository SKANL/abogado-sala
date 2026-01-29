-- 11-fix-rls-recursion.sql
-- Fixes "stack depth limit exceeded" by allowing helper functions to bypass RLS.
-- This breaks the cycle: RLS -> Function -> Table -> RLS.

create or replace function public.app_get_org_id() 
returns uuid 
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  _claims jsonb;
  _org_id uuid;
begin
  -- 1. Optimized: Read from JWT claims first (No DB Hit)
  _claims := current_setting('request.jwt.claims', true)::jsonb;
  _org_id := (_claims -> 'app_metadata' ->> 'org_id')::uuid;
  
  if _org_id is not null then
    return _org_id;
  end if;

  -- 2. Fallback: Query Profiles (Bypasses RLS due to security definer)
  select org_id into _org_id from public.profiles where id = auth.uid();
  return coalesce(_org_id, '00000000-0000-0000-0000-000000000000'::uuid);
end;
$$;

create or replace function public.app_is_admin() 
returns boolean 
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  _claims jsonb;
  _role text;
begin
  -- 1. Optimized: Read from JWT claims first
  _claims := current_setting('request.jwt.claims', true)::jsonb;
  _role := (_claims -> 'app_metadata' ->> 'role');
  
  if _role is not null then
    return _role = 'admin';
  end if;

  -- 2. Fallback: Query Profiles (Bypasses RLS due to security definer)
  return exists (
    select 1 from public.profiles 
    where id = auth.uid() 
    and role = 'admin'
  );
end;
$$;

-- Ensure app_is_active also follows ironclad search_path convention
create or replace function public.app_is_active() 
returns boolean 
language sql 
security definer 
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() 
    and status = 'active'
  );
$$;

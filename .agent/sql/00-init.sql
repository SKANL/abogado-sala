-- 00-init.sql
-- Extensions, Enums, and Helper Functions
-- SINGLE SOURCE OF TRUTH for all type definitions

-- 1. Enable Extensions
create extension if not exists "pg_trgm";
create extension if not exists "vector";

-- 2. Define Enums (CANONICAL DEFINITIONS - DO NOT DUPLICATE IN OTHER FILES)
create type user_status as enum ('active', 'suspended', 'archived'); -- Fix: Soft Delete Support
create type user_role as enum ('admin', 'member');
create type plan_tier as enum ('trial', 'pro', 'enterprise', 'demo');
create type plan_status as enum ('active', 'trialing', 'past_due', 'canceled', 'paused'); -- Fix: Added 'trialing' for explicit state
create type client_status as enum ('prospect', 'active', 'archived');
create type case_status as enum ('draft', 'in_progress', 'review', 'completed');
create type file_status as enum ('pending', 'uploaded', 'error'); -- Fix: Standardized to match 01-tables.sql
create type template_scope as enum ('private', 'global');
create type invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
create type subscription_status as enum ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid');

-- 3. RLS Helper Functions (Security Plumbing)
-- Function to get the current user's organization ID
-- Optimized: Reads from JWT app_metadata first to avoid DB lookup (Performance)
create or replace function public.app_get_org_id() 
returns uuid 
language sql 
stable
as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'org_id')::uuid,
    -- Fallback: Look up in profiles (Costly, but safe for edge cases)
    (select org_id from public.profiles where id = auth.uid()),
    '00000000-0000-0000-0000-000000000000'::uuid
  )
$$;

-- Function to check if the current user is an admin
-- Fix: Now reads from JWT claims first for performance (avoids N+1 DB queries)
create or replace function public.app_is_admin() 
returns boolean 
language sql 
stable
as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') = 'admin',
    -- Fallback: Query profiles table
    (select role = 'admin' from public.profiles where id = auth.uid())
  )
$$;

-- Function to check if the current user is active (Soft Delete enforcement)
-- Fix: SECURITY DEFINER to bypass RLS recursion on public.profiles
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


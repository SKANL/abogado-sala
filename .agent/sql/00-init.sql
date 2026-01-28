-- 00-init.sql
-- Extensions, Enums, and Helper Functions
-- SINGLE SOURCE OF TRUTH for all type definitions

-- 1. Enable Extensions
create extension if not exists "pg_trgm";
create extension if not exists "vector";

-- 2. Define Enums (CANONICAL DEFINITIONS - DO NOT DUPLICATE IN OTHER FILES)
create type user_role as enum ('admin', 'member');
create type plan_tier as enum ('trial', 'pro', 'enterprise', 'demo');
create type plan_status as enum ('active', 'past_due', 'canceled', 'paused'); -- Fix: Added 'paused'
create type client_status as enum ('prospect', 'active', 'archived');
create type case_status as enum ('draft', 'in_progress', 'review', 'completed');
create type file_status as enum ('pending', 'uploaded', 'error'); -- Fix: Standardized to match 01-tables.sql
create type template_scope as enum ('private', 'global');
create type invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
create type subscription_status as enum ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid');

-- 3. RLS Helper Functions (Security Plumbing)
-- Function to get the current user's organization ID
-- Optimized: Reads from JWT app_metadata first to avoid DB lookup (Performance)
create or replace function auth.org_id() 
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
create or replace function auth.is_admin() 
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


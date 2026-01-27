-- 00-init.sql
-- Extensions, Enums, and Helper Functions

-- 1. Enable Extensions
create extension if not exists "pg_trgm";
create extension if not exists "vector";

-- 2. Define Enums
create type user_role as enum ('admin', 'member');
create type plan_tier as enum ('trial', 'pro', 'enterprise', 'demo');
create type plan_status as enum ('active', 'past_due', 'canceled');
create type client_status as enum ('prospect', 'active', 'archived');
create type case_status as enum ('draft', 'in_progress', 'review', 'completed');
create type file_status as enum ('pending', 'uploaded', 'missing', 'rejected');
create type template_scope as enum ('private', 'global');

-- 3. RLS Helper Functions (Security Plumbing)
-- Function to get the current user's organization ID
create or replace function auth.org_id() 
returns uuid 
language sql 
security definer 
stable
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

-- Function to check if the current user is an admin
create or replace function auth.is_admin() 
returns boolean 
language sql 
security definer 
stable
as $$
  select role = 'admin' from public.profiles where id = auth.uid();
$$;

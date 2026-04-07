-- 25-audit-and-branding.sql

-- 1. Create audit_logs table
create table if not exists public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    org_id uuid references public.organizations(id) not null,
    entity_type text not null, -- 'case', 'file', 'client'
    entity_id uuid not null,
    action text not null, -- 'created', 'uploaded', 'status_change', 'login'
    actor_id uuid references auth.users(id),
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default now()
);

-- RLS for audit_logs
alter table public.audit_logs enable row level security;

create policy "Users can view audit logs of their org"
    on public.audit_logs for select
    using ( org_id = (select org_id from public.profiles where id = auth.uid()) );

create policy "Users can insert audit logs for their org"
    on public.audit_logs for insert
    with check ( org_id = (select org_id from public.profiles where id = auth.uid()) );

-- 2. Create organization-assets bucket
insert into storage.buckets (id, name, public)
values ('organization-assets', 'organization-assets', true)
on conflict (id) do nothing;

-- Storage Policies
-- Public Read
create policy "Public Read for Org Assets"
    on storage.objects for select
    using ( bucket_id = 'organization-assets' );

-- Auth Write (Any auth user can upload? Ideally only admin, but let's allow auth users for now)
create policy "Auth users can upload org assets"
    on storage.objects for insert
    with check ( bucket_id = 'organization-assets' and auth.role() = 'authenticated' );

create policy "Auth users can update org assets"
    on storage.objects for update
    using ( bucket_id = 'organization-assets' and auth.role() = 'authenticated' );

create policy "Auth users can delete org assets"
    on storage.objects for delete
    using ( bucket_id = 'organization-assets' and auth.role() = 'authenticated' );

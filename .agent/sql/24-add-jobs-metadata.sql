-- 24-add-jobs-metadata.sql
alter table public.jobs 
add column if not exists metadata jsonb default '{}'::jsonb;

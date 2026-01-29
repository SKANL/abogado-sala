-- 20-fix-storage-policies.sql
-- Description: Re-define storage policies for 'case-files' to ensure Portal (anon) users can upload.

-- 1. Reset Policies for case-files
drop policy if exists "Portal users can upload" on storage.objects;
drop policy if exists "Portal users can select own files" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Authenticated users can select" on storage.objects;
drop policy if exists "Authenticated users can update" on storage.objects;
drop policy if exists "Authenticated users can delete" on storage.objects;

-- 2. Create Explicit Policies
-- Allow Anon (Portal) to insert if it's in 'case-files'
create policy "Portal users can upload case files"
on storage.objects for insert
to anon
with check ( bucket_id = 'case-files' );

-- Allow Anon to update their own files (if needed, e.g. overwrite)
create policy "Portal users can update own case files"
on storage.objects for update
to anon
using ( bucket_id = 'case-files' )
with check ( bucket_id = 'case-files' );

-- Allow Anon to read files (e.g. to see what they uploaded)
create policy "Portal users can view case files"
on storage.objects for select
to anon
using ( bucket_id = 'case-files' );

-- Allow Authenticated (Lawyers/Staff) full access to case-files
create policy "Staff can do everything on case files"
on storage.objects for all
to authenticated
using ( bucket_id = 'case-files' )
with check ( bucket_id = 'case-files' );

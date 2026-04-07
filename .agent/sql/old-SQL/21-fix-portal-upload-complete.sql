-- 21-fix-portal-upload-complete.sql

-- 1. Fix Storage Policies (Ensure SELECT and UPDATE are present for upsert)
-- We drop first to ensure clean slate for these specific policies
drop policy if exists "Portal users can upload case files" on storage.objects;
drop policy if exists "Portal users can select own files" on storage.objects;
drop policy if exists "Portal users can update own case files" on storage.objects;
drop policy if exists "Portal users can view case files" on storage.objects;


create policy "Portal users can upload case files"
on storage.objects for insert
to anon
with check ( bucket_id = 'case-files' );

create policy "Portal users can update case files"
on storage.objects for update
to anon
using ( bucket_id = 'case-files' );

create policy "Portal users can select case files"
on storage.objects for select
to anon
using ( bucket_id = 'case-files' );


-- 2. Create strict RPC for Portal Confirm (Token-based security)
create or replace function public.confirm_file_upload_portal(
  p_token text,
  p_file_id uuid,
  p_file_key text,
  p_file_size bigint
)
returns void
language plpgsql
security definer
as $$
declare
  v_case_id uuid;
  v_exists boolean;
begin
  -- Validate inputs
  if p_file_size <= 0 then
    raise exception 'Invalid file size';
  end if;

  -- 1. Verify Token and Get Case ID
  select id into v_case_id
  from public.cases
  where token = p_token;

  if v_case_id is null then
    raise exception 'Invalid case token';
  end if;

  -- 2. Verify File belongs to this Case
  select exists(
    select 1 from public.case_files
    where id = p_file_id and case_id = v_case_id
  ) into v_exists;

  if not v_exists then
    raise exception 'File does not belong to this case';
  end if;

  -- 3. Update File Status
  update public.case_files
  set 
    status = 'uploaded',
    file_key = p_file_key,
    file_size = p_file_size,
    updated_at = now()
  where id = p_file_id;

end;
$$;

-- 3. Grant Permissions
grant execute on function public.confirm_file_upload_portal(text, uuid, text, bigint) to anon;
grant execute on function public.confirm_file_upload_portal(text, uuid, text, bigint) to authenticated;

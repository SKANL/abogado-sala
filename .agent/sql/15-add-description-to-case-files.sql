-- 15-add-description-to-case-files.sql
-- Description: Fixes missing column error in trigger 'tr_generate_files'.
-- The function 'generate_files_for_case' uses 'description' to store the file label from the template.

alter table public.case_files 
add column if not exists description text;

comment on column public.case_files.description is 'Label or instruction from the template (e.g. "Upload your ID")';

-- 19-add-questionnaire-support.sql
-- Description: Adds support for storing questionnaire answers and the RPC to submit them from Portal.

-- 1. Add Column
alter table public.cases 
add column if not exists questionnaire_answers jsonb default '{}'::jsonb;

-- 2. Create RPC
create or replace function public.submit_questionnaire_answers(
  p_token text,
  p_answers jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_case_id uuid;
begin
  select id into v_case_id from public.cases where token = p_token;
  
  if v_case_id is null then
    raise exception 'Case not found or invalid token';
  end if;

  update public.cases
  set 
    questionnaire_answers = p_answers,
    updated_at = now()
  where id = v_case_id;
end;
$$;

-- 3. Grant Permissions
grant execute on function public.submit_questionnaire_answers(text, jsonb) to anon;
grant execute on function public.submit_questionnaire_answers(text, jsonb) to authenticated;
grant execute on function public.submit_questionnaire_answers(text, jsonb) to service_role;

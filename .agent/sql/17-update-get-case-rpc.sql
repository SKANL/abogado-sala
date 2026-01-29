-- 17-update-get-case-rpc.sql
-- Description: Updates the 'get_case_by_token' RPC to include the 'description' field in the response.

create or replace function public.get_case_by_token(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.cases;
  v_client_name text;
  v_files jsonb;
begin
  select * into v_case from public.cases where token = p_token;
  
  if v_case is null then
    raise exception 'Case not found or invalid token';
  end if;

  if v_case.expires_at < now() then
    raise exception 'Link expired';
  end if;

  select full_name into v_client_name from public.clients where id = v_case.client_id;

  select jsonb_agg(jsonb_build_object(
    'id', cf.id,
    'category', cf.category,
    'description', cf.description,
    'status', cf.status,
    'exception_reason', cf.exception_reason
  )) into v_files
  from public.case_files cf
  where cf.case_id = v_case.id;

  return jsonb_build_object(
    'case', row_to_json(v_case),
    'client_name', v_client_name,
    'files', coalesce(v_files, '[]'::jsonb)
  );
end;
$$;

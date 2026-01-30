-- 23-create-zip-export-trigger.sql

-- Enable pg_net if not already (redundant but safe)
create extension if not exists "pg_net" with schema "extensions";

create or replace function public.trigger_process_zip_job()
returns trigger
language plpgsql
security definer
as $$
declare
  request_id bigint;
begin
  -- Call the Edge Function via pg_net (verify_jwt=false)
  -- URL derived from project ID: zhmkfftbvwvuqpekfvrx
  -- We include the record in the payload.
  
  select net.http_post(
      url := 'https://zhmkfftbvwvuqpekfvrx.supabase.co/functions/v1/process-zip-job',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'record', row_to_json(NEW)
      )
  ) into request_id;

  return NEW;
end;
$$;

-- Drop trigger if exists to prevent duplicates
drop trigger if exists on_zip_job_created on public.jobs;

create trigger on_zip_job_created
  after insert on public.jobs
  for each row
  when (NEW.type = 'zip_export' and NEW.status = 'pending')
  execute function public.trigger_process_zip_job();

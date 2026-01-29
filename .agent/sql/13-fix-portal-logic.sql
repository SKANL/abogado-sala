-- 13-fix-portal-logic.sql
-- Fixes: "No Documents" in Portal (auto-generation) and Portal RLS issues.
-- Includes Backfill for existing cases.

-- 1. Core Logic Function (Reusable)
create or replace function public.generate_files_for_case(
  p_case_id uuid,
  p_org_id uuid,
  p_template_snapshot jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_key text;
  v_field jsonb;
begin
  -- Check if snapshot exists and is not empty
  if p_template_snapshot is null or p_template_snapshot = '{}'::jsonb then
    return;
  end if;

  -- Iterate over keys in the JSONB object
  for v_key, v_field in select * from jsonb_each(p_template_snapshot)
  loop
    -- Check if field type is 'file'
    if (v_field->>'type') = 'file' then
      -- Idempotency check: Don't insert if already exists for this case and label
      if not exists (
          select 1 from public.case_files 
          where case_id = p_case_id 
          and description = (v_field->>'label')
      ) then
          insert into public.case_files (
            org_id,
            case_id,
            category,
            description,
            status,
            updated_at
          ) values (
            p_org_id,
            p_case_id,
            'Otro', 
            v_field->>'label',
            'pending',
            now()
          );
      end if;
    end if;
  end loop;
end;
$$;

-- 2. Trigger Function (Calls Core Logic)
create or replace function public.generate_files_from_snapshot()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.generate_files_for_case(new.id, new.org_id, new.template_snapshot);
  return new;
end;
$$;

-- 3. Bind Trigger
drop trigger if exists tr_generate_files on cases;
create trigger tr_generate_files
  after insert on cases
  for each row
  execute procedure public.generate_files_from_snapshot();

-- 4. Backfill (Repair existing cases)
do $$
declare
  v_case record;
begin
  -- Find cases with a snapshot but potentially missing files
  for v_case in 
    select * from public.cases 
    where template_snapshot is not null 
    and template_snapshot <> '{}'::jsonb
  loop
    perform public.generate_files_for_case(v_case.id, v_case.org_id, v_case.template_snapshot);
  end loop;
end;
$$;

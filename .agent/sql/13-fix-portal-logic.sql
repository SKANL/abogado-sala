-- 13-fix-portal-logic.sql
-- Fixes: "No Documents" in Portal (auto-generation) and Portal RLS issues are handled by Action updates.
-- Author: Antigravity

-- 1. Auto-Generate Case Files from Template Snapshot
-- When a case is created, if it has a template_snapshot, we must explode it into case_files.
create or replace function public.generate_files_from_snapshot()
returns trigger
language plpgsql
security definer
as $$
declare
  v_key text;
  v_field jsonb;
begin
  -- Check if snapshot exists and is not empty
  if new.template_snapshot is null or new.template_snapshot = '{}'::jsonb then
    return new;
  end if;

  -- Iterate over keys in the JSONB object
  for v_key, v_field in select * from jsonb_each(new.template_snapshot)
  loop
    -- Check if field type is 'file'
    if (v_field->>'type') = 'file' then
      insert into public.case_files (
        org_id,
        case_id,
        category,
        description,
        status,
        updated_at
      ) values (
        new.org_id,
        new.id,
        -- Use label as category/description or map if category enum matches
        -- Ideally we'd map 'label' to 'DNI', 'Contrato' etc. 
        -- For now, we fallback to 'Otro' if strict, or textual if allowed.
        -- Our Enum 'file_category' is: DNI, Contrato, Escritura, Poder, Otro, Factura, Sentencia.
        -- We try to guess or default to 'Otro'.
        'Otro', 
        v_field->>'label', -- Description gets the Label (e.g. "INE Reverso")
        'pending',
        now()
      );
    end if;
  end loop;

  return new;
end;
$$;

-- Bind Trigger
drop trigger if exists tr_generate_files on cases;
create trigger tr_generate_files
  after insert on cases
  for each row
  execute procedure public.generate_files_from_snapshot();

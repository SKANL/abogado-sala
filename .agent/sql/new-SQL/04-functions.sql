-- ============================================================
-- 04-functions.sql
-- Funciones auxiliares del proyecto abogado-sala
-- Ejecutar DESPUÉS de 02-tables.sql
-- Nota: Las funciones de extensión (vector, pg_trgm) se crean
--       automáticamente al habilitar las extensiones.
-- ============================================================

-- ── Helper: obtener org_id del JWT o fallback desde profiles ─
CREATE OR REPLACE FUNCTION public.app_get_org_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  _claims jsonb; _org_id uuid;
begin
  _claims := current_setting('request.jwt.claims', true)::jsonb;
  _org_id := (_claims -> 'app_metadata' ->> 'org_id')::uuid;
  if _org_id is not null then return _org_id; end if;
  select org_id into _org_id from public.profiles where id = auth.uid();
  return coalesce(_org_id, '00000000-0000-0000-0000-000000000000'::uuid);
end;
$$;

-- ── Helper: verificar si el usuario tiene rol admin/owner ────
CREATE OR REPLACE FUNCTION public.app_is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  _claims jsonb;
  _role   text;
begin
  _claims := current_setting('request.jwt.claims', true)::jsonb;
  _role   := _claims -> 'app_metadata' ->> 'role';

  -- Fast path: role is already in the JWT (no DB round-trip needed)
  if _role is not null then
    return _role in ('admin', 'owner');
  end if;

  -- Fallback: JWT hasn't been refreshed yet after signup / role change
  return exists (
    select 1
    from public.profiles
    where id   = auth.uid()
      and role in ('admin', 'owner')
  );
end;
$$;

-- ── Helper: verificar si el usuario tiene rol owner ──────────
CREATE OR REPLACE FUNCTION public.app_is_owner()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  _claims jsonb;
  _role   text;
begin
  _claims := current_setting('request.jwt.claims', true)::jsonb;
  _role   := _claims -> 'app_metadata' ->> 'role';

  if _role is not null then
    return _role = 'owner';
  end if;

  return exists (
    select 1
    from public.profiles
    where id   = auth.uid()
      and role = 'owner'
  );
end;
$$;

-- ── Helper: verificar si el usuario está activo ──────────────
CREATE OR REPLACE FUNCTION public.app_is_active()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() 
    and status = 'active'
  );
$$;

-- ── Helper: verificar si es un cliente del portal ────────────
-- NOTA: Falta SET search_path (reportado por el advisor de seguridad)
-- Se corrige aquí añadiendo search_path
CREATE OR REPLACE FUNCTION public.app_is_client()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((auth.jwt()->'app_metadata'->>'role')::text, '') = 'client';
$$;

-- ── Helper: obtener client_id del JWT ────────────────────────
-- NOTA: Corregido con SET search_path (advisor de seguridad)
CREATE OR REPLACE FUNCTION public.app_get_client_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NULLIF((auth.jwt()->'app_metadata'->>'client_id'), '')::uuid;
$$;

-- ── Trigger: actualizar updated_at genérico ──────────────────
-- NOTA: SECURITY INVOKER (coincide con producción - sin privilegios elevados necesarios)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── Trigger: sincronizar claims al JWT en auth.users ─────────
CREATE OR REPLACE FUNCTION public.sync_claims_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  update auth.users
  set raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'org_id', new.org_id,
      'role', new.role
    )
  where id = new.id;
  return new;
end;
$$;

-- ── Trigger: crear perfil automáticamente al registrarse ─────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_role   user_role := 'member';
BEGIN
  SELECT org_id, role
  INTO   v_org_id, v_role
  FROM   public.invitations
  WHERE  email  = NEW.email
    AND  status = 'pending'
  FOR UPDATE LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    UPDATE public.invitations
    SET    status = 'accepted'
    WHERE  email  = NEW.email
      AND  status = 'pending';

    IF NOT FOUND THEN
      v_org_id := NULL;
      v_role   := 'member';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, org_id, role, full_name, avatar_url)
  VALUES (
    NEW.id,
    v_org_id,
    COALESCE(v_role, 'member'),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
EXCEPTION
  WHEN not_null_violation THEN RETURN NEW;
  WHEN others            THEN RETURN NEW;
END;
$$;

-- ── Trigger: verificar que el caso pertenece a una suscripción activa
CREATE OR REPLACE FUNCTION public.ensure_active_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status        plan_status;
  v_trial_ends_at timestamptz;
BEGIN
  SELECT plan_status, trial_ends_at
  INTO   v_status, v_trial_ends_at
  FROM   organizations
  WHERE  id = NEW.org_id;

  IF v_status = 'trialing' AND v_trial_ends_at < NOW() THEN
    RAISE EXCEPTION USING
      ERRCODE = 'BLQUS',
      MESSAGE = 'BILLING_TRIAL_EXPIRED';
  END IF;

  IF v_status NOT IN ('active', 'trialing') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'BLQUS',
      MESSAGE = 'BILLING_SUBSCRIPTION_INACTIVE';
  END IF;

  RETURN NEW;
END;
$$;

-- ── Trigger: verificar cuotas del plan (clientes) ────────────
CREATE OR REPLACE FUNCTION public.check_org_quotas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan_tier     plan_tier;
  v_plan_status   plan_status;
  v_count         int;
  v_limit         int;
  v_lock_key      bigint;
  v_trial_ends_at timestamptz;
  v_org_id        uuid;
  v_new_json      jsonb;
BEGIN
  v_new_json := row_to_json(NEW);

  IF v_new_json ? 'org_id' THEN
    v_org_id := (v_new_json->>'org_id')::uuid;
  ELSE
    RETURN NEW;
  END IF;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_lock_key := hashtext('quota_' || v_org_id::text);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT o.plan_tier, o.plan_status, o.trial_ends_at, pc.max_clients
  INTO   v_plan_tier, v_plan_status, v_trial_ends_at, v_limit
  FROM   organizations o
  LEFT JOIN plan_configs pc ON o.plan_tier = pc.plan
  WHERE  o.id = v_org_id;

  -- Guard 1: trial expirado pero cron no ha corrido → arreglar inline
  IF v_plan_status = 'trialing'
     AND v_trial_ends_at IS NOT NULL
     AND v_trial_ends_at < NOW()
  THEN
    UPDATE public.organizations
    SET    plan_status = 'expired'
    WHERE  id = v_org_id;

    RAISE EXCEPTION USING
      ERRCODE = 'BLTEX',
      MESSAGE = 'BILLING_TRIAL_EXPIRED';
  END IF;

  -- Guard 2: bloquear estados inactivos
  IF v_plan_status NOT IN ('active', 'trialing') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'BLSUB',
      MESSAGE = 'BILLING_SUBSCRIPTION_INACTIVE';
  END IF;

  IF v_limit IS NULL THEN v_limit := 5; END IF;

  IF TG_TABLE_NAME = 'clients' THEN
    SELECT count(*) INTO v_count FROM clients WHERE org_id = v_org_id;
    IF v_count >= v_limit THEN
      RAISE EXCEPTION USING
        ERRCODE = 'BLQCL',
        MESSAGE = 'BILLING_QUOTA_CLIENTS';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── Trigger: actualizar uso de storage ───────────────────────
CREATE OR REPLACE FUNCTION public.update_storage_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_delta bigint;
  v_current_usage bigint;
  v_plan_tier plan_tier;
  v_plan_status plan_status;
  v_limit bigint;
  v_lock_key bigint;
  v_org_id uuid;
  v_trial_ends_at timestamptz;
  v_new_json jsonb;
  v_old_json jsonb;
begin
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
     v_new_json := row_to_json(new);
     if not (v_new_json ? 'org_id') then return null; end if; 
  end if;
  
  if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') then
     v_old_json := row_to_json(old);
     if not (v_old_json ? 'org_id') then return null; end if;
  end if;

  if (TG_OP = 'INSERT') then
     v_delta := coalesce((v_new_json->>'file_size')::bigint, 0);
     v_org_id := (v_new_json->>'org_id')::uuid;
  elsif (TG_OP = 'UPDATE') then
     v_delta := coalesce((v_new_json->>'file_size')::bigint, 0) - coalesce((v_old_json->>'file_size')::bigint, 0);
     v_org_id := (v_new_json->>'org_id')::uuid;
  elsif (TG_OP = 'DELETE') then
     v_delta := -coalesce((v_old_json->>'file_size')::bigint, 0);
     v_org_id := (v_old_json->>'org_id')::uuid;
  end if;

  if v_delta = 0 then return null; end if;
  if v_org_id is null then return null; end if;

  v_lock_key := hashtext('storage_quota_' || v_org_id::text);
  perform pg_advisory_xact_lock(v_lock_key);

  update organizations 
  set storage_used = storage_used + v_delta
  where id = v_org_id
  returning storage_used, plan_tier, plan_status, trial_ends_at 
    into v_current_usage, v_plan_tier, v_plan_status, v_trial_ends_at;

  return null;
exception when others then
  return null;
end;
$$;

-- ── Trigger: encolar eliminación de archivo en storage ───────
CREATE OR REPLACE FUNCTION public.queue_storage_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.file_key IS NOT NULL THEN
    INSERT INTO storage_delete_queue (bucket_id, file_path)
    VALUES ('case-files', OLD.file_key);  -- bucket correcto en producción
  END IF;
  RETURN OLD;
END;
$$;

-- ── Trigger: generar archivos desde template_snapshot ────────
CREATE OR REPLACE FUNCTION public.generate_files_for_case(
  p_case_id         uuid,
  p_org_id          uuid,
  p_template_snapshot jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key   text;
  v_field jsonb;
BEGIN
  IF p_template_snapshot IS NULL OR p_template_snapshot = '{}'::jsonb THEN
    RETURN;
  END IF;

  FOR v_key, v_field IN SELECT * FROM jsonb_each(p_template_snapshot)
  LOOP
    IF (v_field->>'type') = 'file' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.case_files
        WHERE  case_id     = p_case_id
          AND  description = (v_field->>'label')
      ) THEN
        INSERT INTO public.case_files (org_id, case_id, category, description, status, updated_at)
        VALUES (p_org_id, p_case_id, 'Otro', v_field->>'label', 'pending', NOW());
      END IF;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_files_from_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.generate_files_for_case(NEW.id, NEW.org_id, NEW.template_snapshot);
  RETURN NEW;
END;
$$;

-- ── Trigger: auditoría genérica ───────────────────────────────
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_new_json jsonb;
  v_old_json jsonb;
  v_org_id uuid;
begin
  v_new_json := null;
  v_old_json := null;

  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    v_new_json := row_to_json(new);
  end if;
  
  if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') then
    v_old_json := row_to_json(old);
  end if;

  if v_new_json ? 'org_id' then
     v_org_id := (v_new_json->>'org_id')::uuid;
  elsif v_old_json ? 'org_id' then
     v_org_id := (v_old_json->>'org_id')::uuid;
  else
     v_org_id := null;
  end if;

  insert into audit_logs (org_id, actor_id, action, target_id, metadata)
  values (
    v_org_id,
    auth.uid(),
    TG_TABLE_NAME || '_' || TG_OP,
    COALESCE(new.id, old.id),
    jsonb_build_object(
      'old', v_old_json, 
      'new', v_new_json,
      'triggered_by', current_user
    )
  );
  return null;
exception when others then
  return null;
end;
$$;

-- ── Trigger: prevenir eliminación del último admin ────────────
CREATE OR REPLACE FUNCTION public.prevent_last_admin_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_count int;
BEGIN
  IF OLD.role = 'admin' THEN
    SELECT count(*) INTO v_admin_count
    FROM   public.profiles
    WHERE  org_id = OLD.org_id AND role = 'admin';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'INTEG',
        MESSAGE = 'AUTH_LAST_ADMIN';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

-- ── Trigger: verificar que el abogado pertenece a la misma org
CREATE OR REPLACE FUNCTION public.check_lawyer_org_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.assigned_lawyer_id IS NOT NULL THEN
    PERFORM 1 FROM profiles
    WHERE id = NEW.assigned_lawyer_id
      AND org_id = NEW.org_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Integrity Violation: Assigned lawyer must belong to the same organization';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── Trigger: sincronizar estado de suscripción con la org ─────
CREATE OR REPLACE FUNCTION public.sync_subscription_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE organizations
  SET    plan_status = CASE
           WHEN NEW.status = 'active'               THEN 'active'::plan_status
           WHEN NEW.status = 'trialing'             THEN 'trialing'::plan_status
           WHEN NEW.status IN ('past_due','unpaid') THEN 'past_due'::plan_status
           ELSE 'canceled'::plan_status
         END,
         updated_at = NOW()
  WHERE  id = NEW.org_id;
  RETURN NEW;
END;
$$;

-- ── Trigger: updated_at para case_notes ──────────────────────
CREATE OR REPLACE FUNCTION public.update_case_notes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── Trigger: updated_at para tasks ───────────────────────────
-- NOTA: SECURITY INVOKER (coincide con producción)
CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── Trigger: webhook para procesar zip jobs ───────────────────
-- ⚠️  IMPORTANTE AL DESPLEGAR EN NUEVO PROYECTO:
--     Reemplaza '<TU_PROJECT_ID>' con el ID real de tu proyecto Supabase.
--     Puedes encontrarlo en: Settings → General → Reference ID
CREATE OR REPLACE FUNCTION public.trigger_process_zip_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
BEGIN
  -- REEMPLAZAR '<TU_PROJECT_ID>' antes de ejecutar:
  SELECT net.http_post(
    url     := 'https://<TU_PROJECT_ID>.supabase.co/functions/v1/process-zip-job',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := jsonb_build_object('record', row_to_json(NEW))
  ) INTO request_id;
  RETURN NEW;
END;
$$;

-- ── RPC: obtener caso por token (portal público) ──────────────
-- NOTA: Corregido con SET search_path (advisor de seguridad)
CREATE OR REPLACE FUNCTION public.get_case_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_case   public.cases;
  v_client_name TEXT;
  v_files  JSONB;
BEGIN
  SELECT * INTO v_case FROM public.cases WHERE token = p_token;

  IF v_case IS NULL THEN
    RAISE EXCEPTION 'Case not found or invalid token';
  END IF;

  IF v_case.expires_at < now() THEN
    RAISE EXCEPTION 'Link expired';
  END IF;

  SELECT full_name INTO v_client_name FROM public.clients WHERE id = v_case.client_id;

  SELECT jsonb_agg(jsonb_build_object(
    'id',              cf.id,
    'category',        cf.category,
    'description',     cf.description,
    'status',          cf.status,
    'exception_reason',cf.exception_reason,
    'review_note',     cf.review_note
  )) INTO v_files
  FROM public.case_files cf
  WHERE cf.case_id = v_case.id;

  RETURN jsonb_build_object(
    'case',        row_to_json(v_case),
    'client_name', v_client_name,
    'files',       COALESCE(v_files, '[]'::jsonb)
  );
END;
$$;

-- ── RPC: obtener actualizaciones del caso por token ───────────
-- NOTA: Corregido con SET search_path (advisor de seguridad)
CREATE OR REPLACE FUNCTION public.get_case_updates_by_token(p_token text)
RETURNS TABLE(
  id          uuid,
  title       text,
  body        text,
  type        text,
  author_name text,
  created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cu.id,
    cu.title,
    cu.body,
    cu.type,
    p.full_name  AS author_name,
    cu.created_at
  FROM   public.case_updates cu
  LEFT JOIN public.profiles p   ON p.id = cu.author_id
  JOIN  public.cases c          ON c.id = cu.case_id
  WHERE c.token = p_token
  ORDER BY cu.created_at DESC;
END;
$$;

-- ── RPC: validar enlace de portal (landing pública) ───────────
CREATE OR REPLACE FUNCTION public.get_case_validation(p_token text)
RETURNS TABLE(
  found           boolean,
  org_name        text,
  org_logo_url    text,
  client_name     text,
  case_status     text,
  case_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    true                AS found,
    o.name             AS org_name,
    o.logo_url         AS org_logo_url,
    c.full_name        AS client_name,
    cse.status::text   AS case_status,
    cse.created_at     AS case_created_at
  FROM   cases cse
  JOIN   organizations o ON o.id = cse.org_id
  JOIN   clients c       ON c.id = cse.client_id
  WHERE  cse.token = p_token;
END;
$$;

-- ── RPC: actualizar progreso desde el portal ─────────────────
CREATE OR REPLACE FUNCTION public.update_case_progress(p_token text, p_step_index integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_case_id uuid;
begin
  if p_step_index < 0 then
    raise exception 'Invalid Step Index: Cannot be negative';
  end if;

  select id into v_case_id from public.cases where token = p_token and expires_at > now();
  
  if v_case_id is null then return; end if;

  update public.cases
  set current_step_index = p_step_index, updated_at = now()
  where id = v_case_id;
end;
$$;

-- ── RPC: marcar excepción en archivo desde portal ─────────────
CREATE OR REPLACE FUNCTION public.flag_file_exception(p_token text, p_file_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_case_id uuid;
begin
  select id into v_case_id from public.cases where token = p_token and expires_at > now();
  
  if v_case_id is null then
    raise exception 'Invalid or Expired Link';
  end if;

  update public.case_files
  set 
    status = 'pending',
    exception_reason = p_reason,
    updated_at = now()
  where id = p_file_id 
  and case_id = v_case_id;
end;
$$;

-- ── RPC: confirmar upload desde panel de abogados ────────────
CREATE OR REPLACE FUNCTION public.confirm_file_upload(
  p_file_id   uuid,
  p_file_size bigint,
  p_file_key  text
)
RETURNS public.case_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_file   public.case_files;
  v_org_id uuid;
BEGIN
  IF p_file_size <= 0 THEN
    RAISE EXCEPTION 'Invalid file size: must be positive';
  END IF;

  IF p_file_key IS NULL OR length(trim(p_file_key)) = 0 THEN
    RAISE EXCEPTION 'Invalid file key: cannot be empty';
  END IF;

  SELECT c.org_id INTO v_org_id
  FROM   public.case_files cf
  JOIN   public.cases c ON c.id = cf.case_id
  WHERE  cf.id = p_file_id
    AND  c.org_id = public.app_get_org_id()
    AND  (
           public.app_is_admin()
           OR EXISTS (
             SELECT 1 FROM public.clients cl
             WHERE  cl.id = c.client_id
               AND  cl.assigned_lawyer_id = (SELECT auth.uid())
           )
         )
    AND  public.app_is_active();

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'File not found or access denied';
  END IF;

  UPDATE public.case_files
  SET    status     = 'uploaded',
         file_size  = p_file_size,
         file_key   = p_file_key,
         updated_at = NOW()
  WHERE  id = p_file_id
  RETURNING * INTO v_file;

  RETURN v_file;
END;
$$;

-- ── RPC: confirmar upload desde portal del cliente ───────────
CREATE OR REPLACE FUNCTION public.confirm_file_upload_portal(
  p_token     text,
  p_file_id   uuid,
  p_file_key  text,
  p_file_size bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_case_id uuid;
  v_exists  boolean;
BEGIN
  IF p_file_size <= 0 THEN
    RAISE EXCEPTION 'Invalid file size';
  END IF;

  SELECT id INTO v_case_id
  FROM   public.cases
  WHERE  token = p_token;

  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'Invalid case token';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.case_files
    WHERE  id = p_file_id AND case_id = v_case_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'File does not belong to this case';
  END IF;

  UPDATE public.case_files
  SET    status     = 'uploaded',
         file_key   = p_file_key,
         file_size  = p_file_size,
         updated_at = NOW()
  WHERE  id = p_file_id;
END;
$$;

-- ── RPC: regenerar token de un caso ──────────────────────────
CREATE OR REPLACE FUNCTION public.regenerate_case_token(p_case_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_new_token text;
begin
  if not exists (
    select 1 from public.cases c
    where c.id = p_case_id
    and (
      (public.app_is_admin() and c.org_id = public.app_get_org_id())
      or exists (
        select 1 from public.clients cl
        where cl.id = c.client_id
        and cl.assigned_lawyer_id = auth.uid()
      )
    )
    and public.app_is_active()
  ) then
    raise exception 'Access Denied or Case Not Found';
  end if;

  v_new_token := encode(gen_random_bytes(32), 'hex');

  update public.cases
  set token = v_new_token, updated_at = now()
  where id = p_case_id;

  return v_new_token;
end;
$$;

-- ── RPC: obtener invitación por token ────────────────────────
-- NOTA: SECURITY INVOKER (sin privilegios elevados, solo lectura de invitaciones)
CREATE OR REPLACE FUNCTION public.get_invitation(p_token text)
RETURNS TABLE(
  id         uuid,
  email      text,
  role       public.user_role,
  status     public.invitation_status,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.email, i.role, i.status, i.expires_at
  FROM   public.invitations i
  WHERE  i.token = p_token;
END;
$$;

-- ── RPC: obtener invitación con datos de org (onboarding) ────
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE(
  email    text,
  org_name text,
  role     public.user_role,
  status   public.invitation_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT i.email, o.name AS org_name, i.role, i.status
  FROM   public.invitations i
  JOIN   public.organizations o ON o.id = i.org_id
  WHERE  i.token = p_token
    AND  i.status = 'pending'
    AND  i.expires_at > NOW();
END;
$$;

-- ── RPC: listar miembros de la organización con email ─────────
CREATE OR REPLACE FUNCTION public.get_org_members_with_email(p_org_id uuid)
RETURNS TABLE(
  id         uuid,
  full_name  text,
  avatar_url text,
  role       text,
  status     text,
  email      text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.role::text,
    p.status::text,
    u.email,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.org_id = p_org_id
  ORDER BY p.full_name;
$$;

-- ── RPC: eliminar organización completa (solo owner) ──────────
CREATE OR REPLACE FUNCTION public.delete_organization(p_org_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- ── Guards ────────────────────────────────────────────────
  IF NOT public.app_is_owner() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Only the organisation owner can delete it';
  END IF;

  IF p_org_id <> public.app_get_org_id() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: You do not belong to this organisation';
  END IF;

  IF NOT public.app_is_active() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Account is not active';
  END IF;

  -- ── Colectar IDs de miembros antes de eliminar ────────────
  RETURN QUERY
    SELECT id FROM public.profiles WHERE org_id = p_org_id;

  -- ── 1. audit_logs ─────────────────────────────────────────
  DELETE FROM public.audit_logs WHERE org_id = p_org_id;

  -- ── 2. templates ──────────────────────────────────────────
  DELETE FROM public.templates WHERE org_id = p_org_id;

  -- ── 3. case_files (trigger encola eliminación física) ─────
  DELETE FROM public.case_files WHERE org_id = p_org_id;

  -- ── 4. Eliminar organización (CASCADE maneja el resto) ────
  DELETE FROM public.organizations WHERE id = p_org_id;

END;
$$;

-- ── RPC: remover miembro de la organización ───────────────────
CREATE OR REPLACE FUNCTION public.remove_org_member(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_requester_org uuid;
  v_target_org    uuid;
  v_target_role   user_role;
  v_admin_count   int;
BEGIN
  v_requester_org := public.app_get_org_id();

  IF NOT public.app_is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only Admins can remove members.';
  END IF;

  IF NOT public.app_is_active() THEN
    RAISE EXCEPTION 'Access Denied: User is suspended.';
  END IF;

  SELECT org_id, role
  INTO   v_target_org, v_target_role
  FROM   public.profiles
  WHERE  id = target_user_id;

  IF v_target_org IS NULL OR v_target_org <> v_requester_org THEN
    RAISE EXCEPTION 'Target user not found in your organization.';
  END IF;

  IF v_target_role = 'admin' THEN
    SELECT count(*) INTO v_admin_count
    FROM   public.profiles
    WHERE  org_id = v_requester_org AND role = 'admin' AND status = 'active';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Constraint Violation: Cannot remove the last Admin of the organization.';
    END IF;
  END IF;

  UPDATE public.profiles
  SET    status = 'suspended', updated_at = NOW()
  WHERE  id = target_user_id;
END;
$$;

-- ── RPC: expirar organizaciones en trial vencido ──────────────
CREATE OR REPLACE FUNCTION public.expire_trialing_organizations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.organizations
  SET    plan_status = 'expired'
  WHERE  plan_status = 'trialing'
    AND  trial_ends_at IS NOT NULL
    AND  trial_ends_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- ── RPC: rate limiting por token bucket ───────────────────────
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key                     text,
  p_capacity                integer,
  p_refill_rate_per_second  integer,
  p_cost                    integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tokens         int;
  v_last_refill    timestamptz;
  v_now            timestamptz := NOW();
  v_seconds_passed numeric;
  v_new_tokens     int;
BEGIN
  SELECT tokens, last_refill
  INTO   v_tokens, v_last_refill
  FROM   public.rate_limits
  WHERE  key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    v_tokens      := p_capacity;
    v_last_refill := v_now;
    INSERT INTO public.rate_limits (key, tokens, last_refill)
    VALUES (p_key, v_tokens, v_last_refill);
  END IF;

  v_seconds_passed := EXTRACT(EPOCH FROM (v_now - v_last_refill));
  v_new_tokens     := floor(v_seconds_passed * p_refill_rate_per_second)::int;

  IF v_new_tokens > 0 THEN
    v_tokens      := LEAST(v_tokens + v_new_tokens, p_capacity);
    v_last_refill := v_now;
  END IF;

  IF v_tokens >= p_cost THEN
    UPDATE public.rate_limits
    SET    tokens = v_tokens - p_cost, last_refill = v_last_refill
    WHERE  key = p_key;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- ── RPC: registrar acceso al portal de analytics ─────────────
CREATE OR REPLACE FUNCTION public.log_portal_access(
  p_case_token  text,
  p_event_type  text,
  p_step_index  integer DEFAULT NULL,
  p_metadata    jsonb   DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_case_id uuid;
begin
  select id into v_case_id from public.cases where token = p_case_token;
  
  if v_case_id is null then
    return;
  end if;

  insert into public.portal_analytics (
    case_id, 
    event_type, 
    step_index, 
    metadata,
    user_agent
  )
  values (
    v_case_id, 
    p_event_type, 
    p_step_index, 
    p_metadata,
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
end;
$$;

-- ── RPC: enviar respuestas del cuestionario ───────────────────
CREATE OR REPLACE FUNCTION public.submit_questionnaire_answers(p_token text, p_answers jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_case_id uuid;
BEGIN
  SELECT id INTO v_case_id
  FROM   public.cases
  WHERE  token = p_token;

  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'Case not found or invalid token';
  END IF;

  UPDATE public.cases
  SET    questionnaire_answers = p_answers,
         updated_at             = NOW()
  WHERE  id = v_case_id;
END;
$$;

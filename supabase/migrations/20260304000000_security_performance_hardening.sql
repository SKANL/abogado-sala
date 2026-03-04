-- ============================================================
-- MIGRATION: Security & Performance Hardening
-- Date: 2026-03-04
-- Fixes:
--   1. search_path mutable en 19 funciones (SECURITY WARN)
--   2. RLS initplan - auth.uid() sin SELECT wrapper (PERF WARN)
--   3. Multiple permissive policies en audit_logs y profiles (PERF WARN)
--   4. FK indexes faltantes en case_notes, invitations, jobs (PERF INFO)
--   5. Políticas para rate_limits y storage_delete_queue (SEC INFO)
--   6. Estandarizar case_notes para usar app_get_org_id()
-- ============================================================

-- ============================================================
-- SECTION 1: Fix search_path en todas las funciones DEFINER/INVOKER
-- Protege contra ataques de schema injection
-- ============================================================

-- 1. update_case_notes_updated_at
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

-- 2. check_lawyer_org_match
CREATE OR REPLACE FUNCTION public.check_lawyer_org_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 3. check_org_quotas
CREATE OR REPLACE FUNCTION public.check_org_quotas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 4. check_rate_limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_capacity integer,
  p_refill_rate_per_second integer,
  p_cost integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 5. confirm_file_upload
CREATE OR REPLACE FUNCTION public.confirm_file_upload(
  p_file_id   uuid,
  p_file_size bigint,
  p_file_key  text
)
RETURNS public.case_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 6. confirm_file_upload_portal
CREATE OR REPLACE FUNCTION public.confirm_file_upload_portal(
  p_token     text,
  p_file_id   uuid,
  p_file_key  text,
  p_file_size bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 7. ensure_active_subscription
CREATE OR REPLACE FUNCTION public.ensure_active_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 8. generate_files_for_case
CREATE OR REPLACE FUNCTION public.generate_files_for_case(
  p_case_id           uuid,
  p_org_id            uuid,
  p_template_snapshot jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 9. generate_files_from_snapshot
CREATE OR REPLACE FUNCTION public.generate_files_from_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.generate_files_for_case(NEW.id, NEW.org_id, NEW.template_snapshot);
  RETURN NEW;
END;
$$;

-- 10. get_case_validation
CREATE OR REPLACE FUNCTION public.get_case_validation(p_token text)
RETURNS TABLE(
  found            boolean,
  org_name         text,
  org_logo_url     text,
  client_name      text,
  case_status      text,
  case_created_at  timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 11. get_invitation (INVOKER - sin acceso privilegiado, igual necesita search_path)
CREATE OR REPLACE FUNCTION public.get_invitation(p_token text)
RETURNS TABLE(
  id         uuid,
  email      text,
  role       user_role,
  status     invitation_status,
  expires_at timestamp with time zone
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

-- 12. get_invitation_by_token
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE(
  email    text,
  org_name text,
  role     user_role,
  status   invitation_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 13. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 14. prevent_last_admin_delete
CREATE OR REPLACE FUNCTION public.prevent_last_admin_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 15. queue_storage_deletion
CREATE OR REPLACE FUNCTION public.queue_storage_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.file_key IS NOT NULL THEN
    INSERT INTO storage_delete_queue (bucket_id, file_path)
    VALUES ('secure-docs', OLD.file_key);
  END IF;
  RETURN OLD;
END;
$$;

-- 16. remove_org_member
CREATE OR REPLACE FUNCTION public.remove_org_member(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 17. submit_questionnaire_answers
CREATE OR REPLACE FUNCTION public.submit_questionnaire_answers(p_token text, p_answers jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 18. sync_subscription_status
CREATE OR REPLACE FUNCTION public.sync_subscription_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 19. trigger_process_zip_job
CREATE OR REPLACE FUNCTION public.trigger_process_zip_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT net.http_post(
    url     := 'https://zhmkfftbvwvuqpekfvrx.supabase.co/functions/v1/process-zip-job',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := jsonb_build_object('record', row_to_json(NEW))
  ) INTO request_id;
  RETURN NEW;
END;
$$;


-- ============================================================
-- SECTION 2: Fix RLS initplan - wrap auth.uid() con SELECT
-- Evita re-evaluación por cada fila en queries masivas
-- ============================================================

-- ---- organizations ----
DROP POLICY IF EXISTS "Authenticated users insert organizations" ON public.organizations;
CREATE POLICY "Authenticated users insert organizations"
  ON public.organizations FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- ---- profiles: consolidar 2 UPDATE policies en 1 ----
DROP POLICY IF EXISTS "Users can update their own profile"              ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile in their organization" ON public.profiles;
CREATE POLICY "Update profiles"
  ON public.profiles FOR UPDATE
  TO public
  USING (
    app_is_active() AND (
      (id = (SELECT auth.uid()))
      OR
      (app_is_admin() AND org_id = app_get_org_id())
    )
  );

-- profiles INSERT
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO public
  WITH CHECK ((id = (SELECT auth.uid())) AND app_is_active());

-- ---- clients ----
DROP POLICY IF EXISTS "Select Clients" ON public.clients;
CREATE POLICY "Select Clients"
  ON public.clients FOR SELECT
  TO public
  USING (
    ((app_is_admin() AND org_id = app_get_org_id())
     OR assigned_lawyer_id = (SELECT auth.uid()))
    AND app_is_active()
  );

DROP POLICY IF EXISTS "Update Clients" ON public.clients;
CREATE POLICY "Update Clients"
  ON public.clients FOR UPDATE
  TO public
  USING (
    ((app_is_admin() AND org_id = app_get_org_id())
     OR assigned_lawyer_id = (SELECT auth.uid()))
    AND app_is_active()
  );

-- ---- cases ----
DROP POLICY IF EXISTS "Select Cases" ON public.cases;
CREATE POLICY "Select Cases"
  ON public.cases FOR SELECT
  TO public
  USING (
    ((app_is_admin() AND org_id = app_get_org_id())
     OR EXISTS (
       SELECT 1 FROM clients
       WHERE clients.id = cases.client_id
         AND clients.assigned_lawyer_id = (SELECT auth.uid())
     ))
    AND app_is_active()
  );

DROP POLICY IF EXISTS "Update Cases" ON public.cases;
CREATE POLICY "Update Cases"
  ON public.cases FOR UPDATE
  TO public
  USING (
    ((app_is_admin() AND org_id = app_get_org_id())
     OR EXISTS (
       SELECT 1 FROM clients
       WHERE clients.id = cases.client_id
         AND clients.assigned_lawyer_id = (SELECT auth.uid())
     ))
    AND app_is_active()
  );

DROP POLICY IF EXISTS "Insert Cases" ON public.cases;
CREATE POLICY "Insert Cases"
  ON public.cases FOR INSERT
  TO public
  WITH CHECK (
    org_id = app_get_org_id()
    AND (
      app_is_admin()
      OR (
        EXISTS (
          SELECT 1 FROM clients
          WHERE clients.id = cases.client_id
            AND clients.assigned_lawyer_id = (SELECT auth.uid())
        )
        AND app_is_active()
      )
    )
  );

-- ---- case_files ----
DROP POLICY IF EXISTS "Access Case Files" ON public.case_files;
CREATE POLICY "Access Case Files"
  ON public.case_files FOR SELECT
  TO public
  USING (
    ((app_is_admin() AND org_id = app_get_org_id())
     OR EXISTS (
       SELECT 1 FROM cases
       WHERE cases.id = case_files.case_id
         AND (
           (app_is_admin() AND cases.org_id = app_get_org_id())
           OR EXISTS (
             SELECT 1 FROM clients
             WHERE clients.id = cases.client_id
               AND clients.assigned_lawyer_id = (SELECT auth.uid())
           )
         )
     ))
    AND app_is_active()
  );

DROP POLICY IF EXISTS "Update Case Files" ON public.case_files;
CREATE POLICY "Update Case Files"
  ON public.case_files FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_files.case_id
        AND (
          (app_is_admin() AND cases.org_id = app_get_org_id())
          OR EXISTS (
            SELECT 1 FROM clients
            WHERE clients.id = cases.client_id
              AND clients.assigned_lawyer_id = (SELECT auth.uid())
          )
        )
    )
    AND app_is_active()
  );

DROP POLICY IF EXISTS "Delete Case Files" ON public.case_files;
CREATE POLICY "Delete Case Files"
  ON public.case_files FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_files.case_id
        AND (
          (app_is_admin() AND cases.org_id = app_get_org_id())
          OR EXISTS (
            SELECT 1 FROM clients
            WHERE clients.id = cases.client_id
              AND clients.assigned_lawyer_id = (SELECT auth.uid())
          )
        )
    )
    AND app_is_active()
  );

-- ---- templates ----
DROP POLICY IF EXISTS "Select Templates" ON public.templates;
CREATE POLICY "Select Templates"
  ON public.templates FOR SELECT
  TO public
  USING (
    (((scope = 'global'::template_scope) AND org_id = app_get_org_id())
     OR owner_id = (SELECT auth.uid()))
    AND app_is_active()
  );

DROP POLICY IF EXISTS "Insert Templates" ON public.templates;
CREATE POLICY "Insert Templates"
  ON public.templates FOR INSERT
  TO public
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND org_id = app_get_org_id()
    AND app_is_active()
  );

DROP POLICY IF EXISTS "Update Templates" ON public.templates;
CREATE POLICY "Update Templates"
  ON public.templates FOR UPDATE
  TO public
  USING (owner_id = (SELECT auth.uid()) AND app_is_active());

DROP POLICY IF EXISTS "Delete Templates" ON public.templates;
CREATE POLICY "Delete Templates"
  ON public.templates FOR DELETE
  TO public
  USING (owner_id = (SELECT auth.uid()) AND app_is_active());

-- ---- audit_logs: consolidar 3 SELECT policies en 1 ----
-- Política anterior: admins ven todo su org, members solo los suyos, + una 3a redundante
-- Nueva: cualquier miembro activo de la org ve todos los logs de su org (la más permisiva de las 3)
DROP POLICY IF EXISTS "Admins view audit logs"              ON public.audit_logs;
DROP POLICY IF EXISTS "Members view own logs"               ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view audit logs of their org" ON public.audit_logs;
CREATE POLICY "View audit logs"
  ON public.audit_logs FOR SELECT
  TO public
  USING (
    org_id = app_get_org_id()
    AND app_is_active()
  );

DROP POLICY IF EXISTS "Users can view audit logs of their org" ON public.audit_logs;

DROP POLICY IF EXISTS "Users can insert audit logs for their org" ON public.audit_logs;
CREATE POLICY "Users can insert audit logs for their org"
  ON public.audit_logs FOR INSERT
  TO public
  WITH CHECK (org_id = app_get_org_id());

-- ---- notifications ----
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  TO public
  USING (user_id = (SELECT auth.uid()) AND app_is_active());

DROP POLICY IF EXISTS "Users update own notifications (mark read)" ON public.notifications;
CREATE POLICY "Users update own notifications (mark read)"
  ON public.notifications FOR UPDATE
  TO public
  USING (user_id = (SELECT auth.uid()) AND app_is_active());

-- ---- jobs ----
DROP POLICY IF EXISTS "Users view their own jobs" ON public.jobs;
CREATE POLICY "Users view their own jobs"
  ON public.jobs FOR SELECT
  TO public
  USING (
    org_id = app_get_org_id()
    AND ((requester_id = (SELECT auth.uid())) OR app_is_admin())
    AND app_is_active()
  );

DROP POLICY IF EXISTS "Users can insert jobs" ON public.jobs;
CREATE POLICY "Users can insert jobs"
  ON public.jobs FOR INSERT
  TO public
  WITH CHECK (
    org_id = app_get_org_id()
    AND requester_id = (SELECT auth.uid())
    AND app_is_active()
  );

-- ---- plan_configs ----
DROP POLICY IF EXISTS "Authenticated read plan configs" ON public.plan_configs;
CREATE POLICY "Authenticated read plan configs"
  ON public.plan_configs FOR SELECT
  TO public
  USING ((SELECT auth.role()) = 'authenticated' AND app_is_active());

-- ---- case_notes: estandarizar a app_get_org_id() + fix uid() ----
DROP POLICY IF EXISTS "case_notes_select" ON public.case_notes;
CREATE POLICY "case_notes_select"
  ON public.case_notes FOR SELECT
  TO authenticated
  USING (org_id = app_get_org_id());

DROP POLICY IF EXISTS "case_notes_insert" ON public.case_notes;
CREATE POLICY "case_notes_insert"
  ON public.case_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND org_id = app_get_org_id()
  );

DROP POLICY IF EXISTS "case_notes_update" ON public.case_notes;
CREATE POLICY "case_notes_update"
  ON public.case_notes FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = author_id);

DROP POLICY IF EXISTS "case_notes_delete" ON public.case_notes;
CREATE POLICY "case_notes_delete"
  ON public.case_notes FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = author_id
    OR (org_id = app_get_org_id() AND app_is_admin())
  );


-- ============================================================
-- SECTION 3: Policies para tablas internas sin políticas
-- Acceso solo via funciones SECURITY DEFINER (que bypasean RLS)
-- ============================================================

-- rate_limits: solo accesible via check_rate_limit() DEFINER
CREATE POLICY "internal_only"
  ON public.rate_limits FOR ALL
  USING (false);

-- storage_delete_queue: solo accesible via queue_storage_deletion() DEFINER
CREATE POLICY "internal_only"
  ON public.storage_delete_queue FOR ALL
  USING (false);


-- ============================================================
-- SECTION 4: FK indexes faltantes
-- ============================================================

-- case_notes.author_id → profiles(id)
CREATE INDEX IF NOT EXISTS idx_case_notes_author_id
  ON public.case_notes(author_id);

-- invitations.org_id → organizations(id)
CREATE INDEX IF NOT EXISTS idx_invitations_org_id
  ON public.invitations(org_id);

-- jobs.requester_id → profiles(id)
CREATE INDEX IF NOT EXISTS idx_jobs_requester_id
  ON public.jobs(requester_id);


-- ============================================================
-- SECTION 5 (OPCIONAL): Eliminar índices sin uso
-- ADVERTENCIA: Ejecutar SOLO si confirmas en producción con:
--   SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
-- Están comentados por seguridad - descomentar cuando confirmes.
-- ============================================================

-- DROP INDEX IF EXISTS public.idx_profiles_status;
-- DROP INDEX IF EXISTS public.idx_clients_org_id;       -- cubierto por clients_org_id_email_key
-- DROP INDEX IF EXISTS public.idx_cases_status;
-- DROP INDEX IF EXISTS public.idx_audit_logs_actor;
-- DROP INDEX IF EXISTS public.idx_invitations_email;
-- DROP INDEX IF EXISTS public.idx_storage_delete_queue_status;
-- DROP INDEX IF EXISTS public.idx_case_files_status;
-- DROP INDEX IF EXISTS public.idx_invitations_invited_by;
-- DROP INDEX IF EXISTS public.idx_cases_template_id;
-- DROP INDEX IF EXISTS public.cases_assigned_to_idx;

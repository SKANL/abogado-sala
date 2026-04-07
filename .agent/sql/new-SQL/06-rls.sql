-- ============================================================
-- 06-rls.sql
-- Row Level Security del proyecto abogado-sala
-- Ejecutar DESPUÉS de 04-functions.sql
-- ============================================================
-- Todas las tablas tienen RLS habilitado por default.
-- Arquitectura: app_get_org_id() + app_is_admin() + app_is_active()
-- Roles: admin/owner (gestión), member (asignado), client (portal)
--
-- ─ NOTAS DE SINCRONIZACIÓN CON PRODUCCIÓN (2026-04-05 - revisado):
-- - Las políticas sin "TO <role>" se aplican a {public} (todos los roles).
--   Esto coincide con el estado real de la BD en Supabase.
-- - Las políticas con "TO authenticated" restringen explícitamente.
-- - "audit_logs" INSERT Y SELECT usan {public} (sin TO) para permitir
--   triggers DEFINER. Confirmado vía pg_policies en producción 2026-04-05.
-- - "case_notes" usa "TO authenticated" en todas sus políticas (correcto).
-- ============================================================

-- ── Habilitar RLS en todas las tablas públicas ────────────────
ALTER TABLE public.organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_configs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_files           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_updates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_analytics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_delete_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits          ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- organizations
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "Users can view their own organization"
  ON public.organizations FOR SELECT
  USING (id = app_get_org_id());

CREATE POLICY "Authenticated users insert organizations"
  ON public.organizations FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Admins can update their organization"
  ON public.organizations FOR UPDATE
  USING (id = app_get_org_id() AND app_is_admin());

-- ══════════════════════════════════════════════════════════════
-- plan_configs (solo lectura para usuarios autenticados activos)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "Authenticated read plan configs"
  ON public.plan_configs FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated' AND app_is_active());

-- ══════════════════════════════════════════════════════════════
-- profiles
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT
  USING (org_id = app_get_org_id());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = (SELECT auth.uid()) AND app_is_active());

CREATE POLICY "Update profiles"
  ON public.profiles FOR UPDATE
  USING (
    app_is_active() AND (
      id = (SELECT auth.uid()) OR
      (app_is_admin() AND org_id = app_get_org_id())
    )
  );

-- ══════════════════════════════════════════════════════════════
-- subscriptions (solo lectura para admins)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "Admins view subscriptions"
  ON public.subscriptions FOR SELECT
  USING (org_id = app_get_org_id() AND app_is_admin() AND app_is_active());

-- ══════════════════════════════════════════════════════════════
-- invitations
-- ══════════════════════════════════════════════════════════════
-- FOR ALL con USING aplica la misma condición como WITH CHECK implícitamente.
-- Sin TO <role> → aplica a todos (coincide con producción: {public}).
CREATE POLICY "Admins view and manage invitations"
  ON public.invitations FOR ALL
  USING (org_id = app_get_org_id() AND app_is_admin() AND app_is_active());

-- ══════════════════════════════════════════════════════════════
-- clients
-- ══════════════════════════════════════════════════════════════
-- Admins ven todos; members ven los asignados a ellos.
-- Sin TO <role> → aplica a todos (coincide con producción: {public}).
CREATE POLICY "Select Clients"
  ON public.clients FOR SELECT
  USING (
    (
      (app_is_admin() AND org_id = app_get_org_id()) OR
      assigned_lawyer_id = (SELECT auth.uid())
    ) AND app_is_active()
  );

CREATE POLICY "Members can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (org_id = app_get_org_id() AND app_is_active());

CREATE POLICY "Update Clients"
  ON public.clients FOR UPDATE
  USING (
    (
      (app_is_admin() AND org_id = app_get_org_id()) OR
      assigned_lawyer_id = (SELECT auth.uid())
    ) AND app_is_active()
  );

CREATE POLICY "Delete Clients"
  ON public.clients FOR DELETE
  USING (app_is_admin() AND org_id = app_get_org_id() AND app_is_active());

-- Clientes autenticados ven solo su propio perfil de cliente
CREATE POLICY "client_select_own"
  ON public.clients FOR SELECT
  USING (app_is_client() AND auth_user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- templates
-- ══════════════════════════════════════════════════════════════
-- Sin TO <role> → aplica a todos (coincide con producción: {public}).
CREATE POLICY "Select Templates"
  ON public.templates FOR SELECT
  USING (
    (
      (scope = 'global' AND org_id = app_get_org_id()) OR
      owner_id = (SELECT auth.uid())
    ) AND app_is_active()
  );

CREATE POLICY "Insert Templates"
  ON public.templates FOR INSERT
  WITH CHECK (
    owner_id = (SELECT auth.uid()) AND
    org_id = app_get_org_id() AND
    app_is_active()
  );

CREATE POLICY "Update Templates"
  ON public.templates FOR UPDATE
  USING (owner_id = (SELECT auth.uid()) AND app_is_active());

CREATE POLICY "Delete Templates"
  ON public.templates FOR DELETE
  USING (owner_id = (SELECT auth.uid()) AND app_is_active());

-- ══════════════════════════════════════════════════════════════
-- cases
-- ══════════════════════════════════════════════════════════════
-- Admins ven todos; members ven sus casos (asignados, creados por ellos, o de sus clientes)
-- NOTA: `created_by` fue añadido en migración 20260304000005
-- Sin TO <role> → aplica a todos (coincide con producción: {public}).
CREATE POLICY "Select Cases"
  ON public.cases FOR SELECT
  USING (
    app_is_active() AND (
      (app_is_admin() AND org_id = app_get_org_id()) OR
      assigned_to = (SELECT auth.uid()) OR
      created_by  = (SELECT auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.clients
        WHERE clients.id = cases.client_id
          AND clients.assigned_lawyer_id = (SELECT auth.uid())
      )
    )
  );

-- Cualquier miembro activo de la org puede crear casos
CREATE POLICY "Insert Cases"
  ON public.cases FOR INSERT
  WITH CHECK (
    org_id = app_get_org_id() AND
    app_is_active()
  );

CREATE POLICY "Update Cases"
  ON public.cases FOR UPDATE
  USING (
    app_is_active() AND
    org_id = app_get_org_id() AND (
      app_is_admin() OR
      assigned_to = (SELECT auth.uid()) OR
      created_by  = (SELECT auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.clients
        WHERE clients.id = cases.client_id
          AND clients.assigned_lawyer_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "Delete Cases"
  ON public.cases FOR DELETE
  USING (app_is_admin() AND org_id = app_get_org_id() AND app_is_active());

-- Clientes del portal ven solo sus propios casos
CREATE POLICY "client_select_own_cases"
  ON public.cases FOR SELECT
  USING (app_is_client() AND client_id = app_get_client_id());

-- ══════════════════════════════════════════════════════════════
-- case_files
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "Access Case Files"
  ON public.case_files FOR SELECT
  USING (
    (
      (app_is_admin() AND org_id = app_get_org_id()) OR
      EXISTS (
        SELECT 1 FROM public.cases
        WHERE cases.id = case_files.case_id
          AND (
            (app_is_admin() AND cases.org_id = app_get_org_id()) OR
            EXISTS (
              SELECT 1 FROM public.clients
              WHERE clients.id = cases.client_id
                AND clients.assigned_lawyer_id = (SELECT auth.uid())
            )
          )
      )
    ) AND app_is_active()
  );

CREATE POLICY "Insert Case Files"
  ON public.case_files FOR INSERT
  WITH CHECK (
    org_id = app_get_org_id() AND
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = case_files.case_id
        AND cases.org_id = app_get_org_id()
    ) AND app_is_active()
  );

CREATE POLICY "Update Case Files"
  ON public.case_files FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = case_files.case_id
        AND (
          (app_is_admin() AND cases.org_id = app_get_org_id()) OR
          EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = cases.client_id
              AND clients.assigned_lawyer_id = (SELECT auth.uid())
          )
        )
    ) AND app_is_active()
  );

CREATE POLICY "Delete Case Files"
  ON public.case_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = case_files.case_id
        AND (
          (app_is_admin() AND cases.org_id = app_get_org_id()) OR
          EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = cases.client_id
              AND clients.assigned_lawyer_id = (SELECT auth.uid())
          )
        )
    ) AND app_is_active()
  );

-- Clientes del portal ven y editan sus propios archivos
CREATE POLICY "client_select_own_case_files"
  ON public.case_files FOR SELECT
  USING (
    app_is_client() AND
    case_id IN (SELECT cases.id FROM public.cases WHERE cases.client_id = app_get_client_id())
  );

CREATE POLICY "client_update_own_case_files"
  ON public.case_files FOR UPDATE
  USING (
    app_is_client() AND
    case_id IN (SELECT cases.id FROM public.cases WHERE cases.client_id = app_get_client_id())
  );

-- ══════════════════════════════════════════════════════════════
-- case_notes (solo para usuarios autenticados de la org)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "case_notes_select"
  ON public.case_notes FOR SELECT TO authenticated
  USING (org_id = app_get_org_id());

CREATE POLICY "case_notes_insert"
  ON public.case_notes FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid()) AND
    org_id = app_get_org_id()
  );

CREATE POLICY "case_notes_update"
  ON public.case_notes FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = author_id);

CREATE POLICY "case_notes_delete"
  ON public.case_notes FOR DELETE TO authenticated
  USING (
    (SELECT auth.uid()) = author_id OR
    (org_id = app_get_org_id() AND app_is_admin())
  );

-- ══════════════════════════════════════════════════════════════
-- case_updates
-- ══════════════════════════════════════════════════════════════
-- Sin TO <role> → aplica a todos (coincide con producción: {public}).
CREATE POLICY "case_updates_select"
  ON public.case_updates FOR SELECT
  USING (org_id = app_get_org_id() AND app_is_active());

CREATE POLICY "case_updates_insert"
  ON public.case_updates FOR INSERT
  WITH CHECK (org_id = app_get_org_id() AND app_is_active());

CREATE POLICY "case_updates_delete"
  ON public.case_updates FOR DELETE
  USING (org_id = app_get_org_id() AND app_is_admin() AND app_is_active());

-- Clientes del portal ven actualizaciones de sus casos
CREATE POLICY "client_select_own_case_updates"
  ON public.case_updates FOR SELECT
  USING (
    app_is_client() AND
    case_id IN (SELECT cases.id FROM public.cases WHERE cases.client_id = app_get_client_id())
  );

-- ════════════════════════════════════════════════════════════
-- audit_logs
-- INSERT y SELECT usan {public} (sin TO) para permitir triggers SECURITY DEFINER.
-- Confirmado en producción: roles = {public} para ambas políticas.
-- ════════════════════════════════════════════════════════════
CREATE POLICY "View audit logs"
  ON public.audit_logs FOR SELECT
  USING (org_id = app_get_org_id() AND app_is_active());

CREATE POLICY "Users can insert audit logs for their org"
  ON public.audit_logs FOR INSERT
  WITH CHECK (org_id = app_get_org_id());

-- ══════════════════════════════════════════════════════════════
-- notifications
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = (SELECT auth.uid()) AND app_is_active());

CREATE POLICY "Users update own notifications (mark read)"
  ON public.notifications FOR UPDATE
  USING (user_id = (SELECT auth.uid()) AND app_is_active());

-- ══════════════════════════════════════════════════════════════
-- portal_analytics
-- ══════════════════════════════════════════════════════════════
-- Inserción pública (portal no requiere autenticación)
CREATE POLICY "Public insert portal analytics"
  ON public.portal_analytics FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.cases WHERE cases.id = portal_analytics.case_id)
  );

-- Solo admins ven las analytics
CREATE POLICY "Admins view portal analytics"
  ON public.portal_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = portal_analytics.case_id
        AND cases.org_id = app_get_org_id()
        AND app_is_admin()
    )
  );

-- ══════════════════════════════════════════════════════════════
-- jobs
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "Users can insert jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (
    org_id = app_get_org_id() AND
    requester_id = (SELECT auth.uid()) AND
    app_is_active()
  );

CREATE POLICY "Users view their own jobs"
  ON public.jobs FOR SELECT
  USING (
    org_id = app_get_org_id() AND
    (requester_id = (SELECT auth.uid()) OR app_is_admin()) AND
    app_is_active()
  );

-- ══════════════════════════════════════════════════════════════
-- tasks (usa JWT claims directamente para mejor performance)
-- Sin TO <role> → aplica a todos (coincide con producción: {public}).
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT
  USING (org_id = ((auth.jwt() ->> 'org_id'::text))::uuid);

CREATE POLICY "tasks_insert"
  ON public.tasks FOR INSERT
  WITH CHECK (
    org_id = ((auth.jwt() ->> 'org_id'::text))::uuid AND
    created_by = auth.uid()
  );

CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE
  USING (
    org_id = ((auth.jwt() ->> 'org_id'::text))::uuid AND
    (
      assigned_to = auth.uid() OR
      created_by  = auth.uid() OR
      (auth.jwt() ->> 'role'::text) = ANY (ARRAY['admin', 'owner'])
    )
  );

CREATE POLICY "tasks_delete"
  ON public.tasks FOR DELETE
  USING (
    org_id = ((auth.jwt() ->> 'org_id'::text))::uuid AND
    (auth.jwt() ->> 'role'::text) = ANY (ARRAY['admin', 'owner'])
  );

-- ══════════════════════════════════════════════════════════════
-- deletion_requests
-- Sin TO <role> → aplica a todos (coincide con producción: {public}).
-- ══════════════════════════════════════════════════════════════
-- Members ven sus propias solicitudes; admins ven todas las de la org
CREATE POLICY "Select Deletion Requests"
  ON public.deletion_requests FOR SELECT
  USING (
    app_is_active() AND
    org_id = app_get_org_id() AND
    (requested_by = (SELECT auth.uid()) OR app_is_admin())
  );

-- Members pueden solicitar eliminación en su propia org
CREATE POLICY "Insert Deletion Requests"
  ON public.deletion_requests FOR INSERT
  WITH CHECK (
    org_id = app_get_org_id() AND
    requested_by = (SELECT auth.uid()) AND
    app_is_active()
  );

-- Solo admins pueden aprobar/rechazar solicitudes
CREATE POLICY "Update Deletion Requests"
  ON public.deletion_requests FOR UPDATE
  USING (app_is_admin() AND org_id = app_get_org_id() AND app_is_active());

-- ══════════════════════════════════════════════════════════════
-- storage_delete_queue — solo acceso interno (service role)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "internal_only"
  ON public.storage_delete_queue FOR ALL
  USING (false);

-- ══════════════════════════════════════════════════════════════
-- rate_limits — solo acceso interno (service role)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "internal_only"
  ON public.rate_limits FOR ALL
  USING (false);

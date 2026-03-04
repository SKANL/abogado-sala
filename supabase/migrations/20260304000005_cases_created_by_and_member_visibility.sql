-- ── 1. cases.created_by ────────────────────────────────────────────────────
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cases_created_by ON public.cases (created_by);

-- ── 2. organizations.members_can_see_all_cases ─────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS members_can_see_all_cases BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 3. Fix "Select Cases" — also allow assigned_to and created_by ──────────
DROP POLICY IF EXISTS "Select Cases" ON public.cases;
CREATE POLICY "Select Cases"
  ON public.cases FOR SELECT
  TO public
  USING (
    app_is_active()
    AND (
      (app_is_admin() AND org_id = app_get_org_id())
      OR cases.assigned_to = (SELECT auth.uid())
      OR cases.created_by  = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.clients
        WHERE clients.id = cases.client_id
          AND clients.assigned_lawyer_id = (SELECT auth.uid())
      )
    )
  );

-- ── 4. Fix "Update Cases" — same logic, scoped to same org ────────────────
DROP POLICY IF EXISTS "Update Cases" ON public.cases;
CREATE POLICY "Update Cases"
  ON public.cases FOR UPDATE
  TO public
  USING (
    app_is_active()
    AND org_id = app_get_org_id()
    AND (
      app_is_admin()
      OR cases.assigned_to = (SELECT auth.uid())
      OR cases.created_by  = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.clients
        WHERE clients.id = cases.client_id
          AND clients.assigned_lawyer_id = (SELECT auth.uid())
      )
    )
  );

-- ── 5. Fix "Insert Cases" — any active org member ─────────────────────────
DROP POLICY IF EXISTS "Insert Cases" ON public.cases;
CREATE POLICY "Insert Cases"
  ON public.cases FOR INSERT
  TO public
  WITH CHECK (
    org_id = app_get_org_id()
    AND app_is_active()
  );

-- ====================================================================
-- Fix: case_notes RLS policies
-- Reason: auth.users is not accessible to the authenticated role.
--         Replace subqueries to auth.users with auth.jwt() which reads
--         claims directly from the session token — no extra table access.
-- ====================================================================

DROP POLICY IF EXISTS "case_notes_select" ON public.case_notes;
DROP POLICY IF EXISTS "case_notes_insert" ON public.case_notes;
DROP POLICY IF EXISTS "case_notes_update" ON public.case_notes;
DROP POLICY IF EXISTS "case_notes_delete" ON public.case_notes;

-- SELECT: any org member can read notes from their org
CREATE POLICY "case_notes_select"
  ON public.case_notes FOR SELECT
  TO authenticated
  USING (
    org_id = (auth.jwt()->'app_metadata'->>'org_id')::UUID
  );

-- INSERT: author_id must match the caller, org_id must match the caller's org
CREATE POLICY "case_notes_insert"
  ON public.case_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (select auth.uid()) AND
    org_id    = (auth.jwt()->'app_metadata'->>'org_id')::UUID
  );

-- UPDATE: only the author can edit
CREATE POLICY "case_notes_update"
  ON public.case_notes FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = author_id);

-- DELETE: author, or owner/admin of the same org
CREATE POLICY "case_notes_delete"
  ON public.case_notes FOR DELETE
  TO authenticated
  USING (
    (select auth.uid()) = author_id OR
    (
      org_id = (auth.jwt()->'app_metadata'->>'org_id')::UUID AND
      (auth.jwt()->'app_metadata'->>'role') IN ('owner', 'admin')
    )
  );

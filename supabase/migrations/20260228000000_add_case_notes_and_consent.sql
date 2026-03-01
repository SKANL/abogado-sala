-- ====================================================================
-- Migration: Case Notes + Org Consent Text
-- Date: 2026-02-28
-- ====================================================================

-- 1. Add consent_text column to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS consent_text TEXT;

-- 2. Create case_notes table
CREATE TABLE IF NOT EXISTS public.case_notes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id     UUID        NOT NULL REFERENCES public.cases(id)         ON DELETE CASCADE,
  org_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 5000),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast retrieval by case
CREATE INDEX IF NOT EXISTS case_notes_case_id_idx ON public.case_notes (case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS case_notes_org_id_idx  ON public.case_notes (org_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_case_notes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_case_notes_updated_at ON public.case_notes;
CREATE TRIGGER trg_case_notes_updated_at
  BEFORE UPDATE ON public.case_notes
  FOR EACH ROW EXECUTE FUNCTION update_case_notes_updated_at();

-- 3. Enable RLS
ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: Any org member can read notes from their org's cases
CREATE POLICY "case_notes_select"
  ON public.case_notes FOR SELECT
  USING (
    org_id = (
      SELECT (raw_app_meta_data->>'org_id')::UUID
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- INSERT: Org member inserts, author_id must be their own user id
CREATE POLICY "case_notes_insert"
  ON public.case_notes FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    org_id = (
      SELECT (raw_app_meta_data->>'org_id')::UUID
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- UPDATE: Only author can edit their own notes
CREATE POLICY "case_notes_update"
  ON public.case_notes FOR UPDATE
  USING (author_id = auth.uid());

-- DELETE: Author or owner/admin of the org can delete notes
CREATE POLICY "case_notes_delete"
  ON public.case_notes FOR DELETE
  USING (
    author_id = auth.uid() OR
    (
      org_id = (
        SELECT (raw_app_meta_data->>'org_id')::UUID
        FROM auth.users WHERE id = auth.uid()
      ) AND
      (auth.jwt()->'app_metadata'->>'role') IN ('owner', 'admin')
    )
  );

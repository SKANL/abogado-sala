-- ─── 1. Extend file_status enum ─────────────────────────────────────────────
ALTER TYPE public.file_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.file_status ADD VALUE IF NOT EXISTS 'rejected';

-- ─── 2. Review columns on case_files ────────────────────────────────────────
ALTER TABLE public.case_files
  ADD COLUMN IF NOT EXISTS review_note   TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by   UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at   TIMESTAMPTZ;

-- ─── 3. case_updates table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.case_updates (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id     UUID        NOT NULL REFERENCES public.cases(id)    ON DELETE CASCADE,
  org_id      UUID        NOT NULL,
  author_id   UUID        REFERENCES public.profiles(id),
  title       TEXT        NOT NULL,
  body        TEXT,
  type        TEXT        NOT NULL DEFAULT 'info'
                          CHECK (type IN ('info', 'milestone', 'warning', 'document_request')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. RLS for case_updates ─────────────────────────────────────────────────
ALTER TABLE public.case_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_updates_select" ON public.case_updates
  FOR SELECT USING (
    org_id = app_get_org_id() AND app_is_active()
  );

CREATE POLICY "case_updates_insert" ON public.case_updates
  FOR INSERT WITH CHECK (
    org_id = app_get_org_id() AND app_is_active()
  );

CREATE POLICY "case_updates_delete" ON public.case_updates
  FOR DELETE USING (
    org_id = app_get_org_id() AND app_is_admin() AND app_is_active()
  );

-- ─── 5. Update get_case_by_token to expose review_note ───────────────────────
CREATE OR REPLACE FUNCTION public.get_case_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ─── 6. New RPC: get_case_updates_by_token (portal / anon access) ────────────
CREATE OR REPLACE FUNCTION public.get_case_updates_by_token(p_token TEXT)
RETURNS TABLE (
  id         UUID,
  title      TEXT,
  body       TEXT,
  type       TEXT,
  author_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
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

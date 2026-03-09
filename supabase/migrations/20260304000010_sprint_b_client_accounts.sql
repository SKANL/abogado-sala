-- ─── Sprint B: Client Account Registration ────────────────────────────────────

-- 1. Link Supabase auth users to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_auth_user_id_key
  ON public.clients(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- 2. Helper functions for RLS
CREATE OR REPLACE FUNCTION public.app_is_client()
  RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((auth.jwt()->'app_metadata'->>'role')::text, '') = 'client';
$$;

CREATE OR REPLACE FUNCTION public.app_get_client_id()
  RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT NULLIF((auth.jwt()->'app_metadata'->>'client_id'), '')::uuid;
$$;

-- 3. RLS: clients can read their own row
CREATE POLICY "client_select_own"
  ON public.clients FOR SELECT
  USING (app_is_client() AND auth_user_id = auth.uid());

-- 4. RLS: clients can read their own cases
CREATE POLICY "client_select_own_cases"
  ON public.cases FOR SELECT
  USING (app_is_client() AND client_id = app_get_client_id());

-- 5. RLS: clients can read files for their cases
CREATE POLICY "client_select_own_case_files"
  ON public.case_files FOR SELECT
  USING (
    app_is_client() AND
    case_id IN (SELECT id FROM public.cases WHERE client_id = app_get_client_id())
  );

-- 6. RLS: clients can UPDATE their own files (re-upload rejected docs)
CREATE POLICY "client_update_own_case_files"
  ON public.case_files FOR UPDATE
  USING (
    app_is_client() AND
    case_id IN (SELECT id FROM public.cases WHERE client_id = app_get_client_id())
  );

-- 7. RLS: clients can read case updates
CREATE POLICY "client_select_own_case_updates"
  ON public.case_updates FOR SELECT
  USING (
    app_is_client() AND
    case_id IN (SELECT id FROM public.cases WHERE client_id = app_get_client_id())
  );

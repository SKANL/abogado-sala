-- Migration: deletion_requests table + members_can_see_all_clients org setting
-- Applied: 2026-03-04

-- ── Deletion Requests ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('case', 'client')),
  entity_id     UUID NOT NULL,
  entity_label  TEXT NOT NULL,
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Members can see their own requests; admins can see all in their org
CREATE POLICY "Members see own deletion requests"
  ON public.deletion_requests FOR SELECT
  USING (
    requested_by = auth.uid()
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid = org_id
      AND app_is_admin()
    )
  );

-- Members can insert requests in their org
CREATE POLICY "Members can request deletion"
  ON public.deletion_requests FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid = org_id
    AND requested_by = auth.uid()
  );

-- Only admins can update (approve/reject)
CREATE POLICY "Admins can review deletion requests"
  ON public.deletion_requests FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid = org_id
    AND app_is_admin()
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.tr_deletion_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_deletion_requests_updated_at
  BEFORE UPDATE ON public.deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.tr_deletion_requests_updated_at();

-- ── Organizations: members_can_see_all_clients ─────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS members_can_see_all_clients BOOLEAN DEFAULT FALSE;

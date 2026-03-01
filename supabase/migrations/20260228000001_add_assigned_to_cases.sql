-- ====================================================================
-- Migration: Add assigned_to column to cases
-- Date: 2026-02-28
-- ====================================================================

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Index for filtering by assignee (used in dashboard + kanban views)
CREATE INDEX IF NOT EXISTS cases_assigned_to_idx ON public.cases(assigned_to);

-- RLS: existing policies on cases already cover this column via org_id checks
-- No new policies needed

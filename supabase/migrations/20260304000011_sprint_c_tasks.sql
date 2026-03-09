-- ─── Sprint C: Task Management ────────────────────────────────────────────────
-- Tasks/to-dos per case, assignable to team members with deadlines.
-- Date: 2026-03-04

-- 1. Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id      UUID        NOT NULL REFERENCES public.cases(id)         ON DELETE CASCADE,
  title        TEXT        NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 255),
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority     TEXT        NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS tasks_case_id_idx    ON public.tasks (case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tasks_org_id_idx     ON public.tasks (org_id);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_status_idx     ON public.tasks (org_id, status);

-- 3. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_tasks_updated_at();

-- 4. Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Helper: extract org_id from JWT
-- (reusable expression, inlined in each policy for clarity)

-- SELECT: Any org member can read tasks in their org
CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT
  USING (
    org_id = (auth.jwt() ->> 'org_id')::UUID
  );

-- INSERT: Any org member can create tasks; org_id + created_by must match session
CREATE POLICY "tasks_insert"
  ON public.tasks FOR INSERT
  WITH CHECK (
    org_id = (auth.jwt() ->> 'org_id')::UUID
    AND created_by = auth.uid()
  );

-- UPDATE: Assignee, admin, or owner can update
CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE
  USING (
    org_id = (auth.jwt() ->> 'org_id')::UUID
    AND (
      assigned_to = auth.uid()
      OR created_by = auth.uid()
      OR (auth.jwt() ->> 'role') IN ('admin', 'owner')
    )
  );

-- DELETE: Only admin or owner
CREATE POLICY "tasks_delete"
  ON public.tasks FOR DELETE
  USING (
    org_id = (auth.jwt() ->> 'org_id')::UUID
    AND (auth.jwt() ->> 'role') IN ('admin', 'owner')
  );

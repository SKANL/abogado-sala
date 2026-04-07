-- ============================================================
-- 03-indexes.sql
-- Índices de rendimiento del proyecto abogado-sala
-- Ejecutar DESPUÉS de 02-tables.sql
-- ============================================================

-- ── audit_logs ────────────────────────────────────────────────
CREATE INDEX idx_audit_logs_org_id_created ON public.audit_logs USING btree (org_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor         ON public.audit_logs USING btree (actor_id);
CREATE INDEX idx_audit_logs_actor_action  ON public.audit_logs USING btree (actor_id, action);

-- ── case_files ────────────────────────────────────────────────
CREATE INDEX idx_case_files_case_id ON public.case_files USING btree (case_id);
CREATE INDEX idx_case_files_org_id  ON public.case_files USING btree (org_id);
CREATE INDEX idx_case_files_status  ON public.case_files USING btree (status);

-- ── case_notes ────────────────────────────────────────────────
CREATE INDEX case_notes_case_id_idx  ON public.case_notes USING btree (case_id, created_at DESC);
CREATE INDEX case_notes_org_id_idx   ON public.case_notes USING btree (org_id);
CREATE INDEX idx_case_notes_author_id ON public.case_notes USING btree (author_id);

-- ── cases ─────────────────────────────────────────────────────
CREATE INDEX idx_cases_org_id       ON public.cases USING btree (org_id);
CREATE INDEX idx_cases_client_id    ON public.cases USING btree (client_id);
CREATE INDEX idx_cases_status       ON public.cases USING btree (status);
CREATE INDEX idx_cases_token        ON public.cases USING btree (token);
CREATE INDEX idx_cases_created_by   ON public.cases USING btree (created_by);
CREATE INDEX cases_assigned_to_idx  ON public.cases USING btree (assigned_to);
CREATE INDEX idx_cases_template_id  ON public.cases USING btree (template_id) WHERE template_id IS NOT NULL;

-- ── clients ───────────────────────────────────────────────────
CREATE INDEX idx_clients_org_id          ON public.clients USING btree (org_id);
CREATE INDEX idx_clients_assigned_lawyer ON public.clients USING btree (assigned_lawyer_id);
CREATE INDEX idx_clients_email_org       ON public.clients USING btree (org_id, email);

-- ── deletion_requests ─────────────────────────────────────────
CREATE INDEX idx_deletion_requests_org_status    ON public.deletion_requests USING btree (org_id, status);
CREATE INDEX idx_deletion_requests_requested_by  ON public.deletion_requests USING btree (requested_by);

-- ── invitations ───────────────────────────────────────────────
CREATE INDEX idx_invitations_org_id     ON public.invitations USING btree (org_id);
CREATE INDEX idx_invitations_email      ON public.invitations USING btree (email);
CREATE INDEX idx_invitations_token      ON public.invitations USING btree (token);
CREATE INDEX idx_invitations_invited_by ON public.invitations USING btree (invited_by);

-- ── jobs ──────────────────────────────────────────────────────
CREATE INDEX idx_jobs_org_id       ON public.jobs USING btree (org_id);
CREATE INDEX idx_jobs_requester_id ON public.jobs USING btree (requester_id);
CREATE INDEX idx_jobs_status       ON public.jobs USING btree (status);

-- ── notifications ─────────────────────────────────────────────
CREATE INDEX idx_notifications_org_id      ON public.notifications USING btree (org_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id) WHERE read = false;

-- ── portal_analytics ──────────────────────────────────────────
CREATE INDEX idx_portal_analytics_case_id ON public.portal_analytics USING btree (case_id);

-- ── profiles ──────────────────────────────────────────────────
CREATE INDEX idx_profiles_org_id ON public.profiles USING btree (org_id);
CREATE INDEX idx_profiles_status ON public.profiles USING btree (status);

-- ── storage_delete_queue ──────────────────────────────────────
CREATE INDEX idx_storage_delete_queue_status ON public.storage_delete_queue USING btree (status);

-- ── subscriptions ─────────────────────────────────────────────
CREATE INDEX idx_subscriptions_org_id ON public.subscriptions USING btree (org_id);

-- ── tasks ─────────────────────────────────────────────────────
CREATE INDEX tasks_org_id_idx      ON public.tasks USING btree (org_id);
CREATE INDEX tasks_case_id_idx     ON public.tasks USING btree (case_id, created_at DESC);
CREATE INDEX tasks_assigned_to_idx ON public.tasks USING btree (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX tasks_status_idx      ON public.tasks USING btree (org_id, status);

-- ── templates ─────────────────────────────────────────────────
CREATE INDEX idx_templates_org_id   ON public.templates USING btree (org_id);
CREATE INDEX idx_templates_owner_id ON public.templates USING btree (owner_id);

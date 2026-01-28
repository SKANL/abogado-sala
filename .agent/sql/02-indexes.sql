-- 02-indexes.sql
-- Performance Tuning: Foreign Key Indexes & Common Lookups
-- Why? Postgres DOES NOT automatically index Foreign Keys.
-- These are critical for avoiding Seq Scans in tenant-isolated queries (WHERE org_id = ...)

-- 1. Organization & Security Context
create index if not exists idx_profiles_org_id on profiles(org_id);
create index if not exists idx_profiles_status on profiles(status); -- For auth.is_active() speed

-- 2. CRM Relationships
create index if not exists idx_clients_org_id on clients(org_id);
create index if not exists idx_clients_assigned_lawyer on clients(assigned_lawyer_id);
create index if not exists idx_clients_email_org on clients(org_id, email); -- Unique check optimization

-- 3. Case Management
create index if not exists idx_cases_client_id on cases(client_id);
create index if not exists idx_cases_org_id on cases(org_id);
create index if not exists idx_cases_status on cases(status);
create index if not exists idx_cases_token on cases(token); -- For Portal lookups

-- 4. Files
create index if not exists idx_case_files_case_id on case_files(case_id);
create index if not exists idx_case_files_org_id on case_files(org_id);

-- 5. Audit & Logistics
create index if not exists idx_audit_logs_org_id_created on audit_logs(org_id, created_at desc); -- For Dashboard Feed
create index if not exists idx_audit_logs_actor on audit_logs(actor_id);
create index if not exists idx_invitations_token on invitations(token);
create index if not exists idx_invitations_email on invitations(email);

-- 6. Jobs & Notifications
create index if not exists idx_jobs_org_id on jobs(org_id);
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_notifications_user_unread on notifications(user_id) where read = false; -- Partial Index for UI Badge count

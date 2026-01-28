-- 08-integrity-checks.sql
-- Forensic Audit: Hardening Loose Text Columns
-- Problem: 'jobs.status' and 'notifications.type' are TEXT, prone to typos (fragile logic).
-- Solution: Add Check Constraints to enforce expected values.

-- 1. Hardening Jobs Table
alter table public.jobs 
add constraint check_job_status 
check (status in ('pending', 'processing', 'completed', 'failed'));

alter table public.jobs 
add constraint check_job_type 
check (type in ('zip_export', 'report_gen'));

-- 2. Hardening Notifications Table
alter table public.notifications
add constraint check_notification_type
check (type in ('info', 'warning', 'success', 'error'));

-- 3. Hardening Storage Queue
-- Ensure we don't process invalid bucket paths
alter table public.storage_delete_queue
add constraint check_queue_status
check (status in ('pending', 'processing', 'completed', 'failed'));

-- 4. Hardening Case Files (Category)
-- Prevent random categories like "dni" vs "DNI"
alter table public.case_files
add constraint check_file_category
check (category in ('DNI', 'Contrato', 'Escritura', 'Poder', 'Otro', 'Factura', 'Sentencia'));

-- 5. Hardening Portal Analytics (Events)
-- Ensure analytics are uniform for aggregation
alter table public.portal_analytics
add constraint check_event_type
check (event_type in ('view', 'download', 'print', 'complete', 'exception'));

-- 6. Foreign Key Index Verification (Double Check)
-- Verified: 06-perf-optimization.sql covers major FKs.
-- Adding one edge case: `invitations.invited_by`
create index if not exists idx_invitations_invited_by on invitations(invited_by);

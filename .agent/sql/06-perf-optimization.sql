-- 06-perf-optimization.sql
-- SRE Optimization: Missing Indexes & Performance Tuning
-- Generated based on audit of 01-tables.sql and 02-indexes.sql

-- 1. Organization Isolation (Critical for RLS Performance)
-- Templates are heavy objects, indexing org_id is crucial for identifying tenant data quickly.
create index if not exists idx_templates_org_id on templates(org_id);
create index if not exists idx_templates_owner_id on templates(owner_id); -- For "My Templates" queries

-- 2. System Tables & Billing
-- Subscriptions are queried on every dashboard load to check status.
create index if not exists idx_subscriptions_org_id on subscriptions(org_id);
-- Notifications are queried by org for admin broadcasts.
create index if not exists idx_notifications_org_id on notifications(org_id);

-- 3. Analytics & Logistics
-- Portal Analytics will grow fast. Indexing case_id is mandatory for efficient JOINs.
create index if not exists idx_portal_analytics_case_id on portal_analytics(case_id);
-- Storage Queue needs to be Polled. Indexing by status allows partial index support if needed, but standard B-tree is fine here.
create index if not exists idx_storage_delete_queue_status on storage_delete_queue(status);

-- 4. Audit Log Optimization (Time-Series)
-- Already indexed in 02-indexes.sql: (org_id, created_at desc)
-- Adding actor_id + action composite for "User Activity History" views
create index if not exists idx_audit_logs_actor_action on audit_logs(actor_id, action);

-- 5. Case File Management
-- Searching for files by status (finding "missing" docs quickly)
create index if not exists idx_case_files_status on case_files(status);

-- 27-enable-realtime.sql
-- Purpose: Explicitly add tables to the 'supabase_realtime' publication.
-- By default, new tables are NOT added to realtime to save resources.
-- Required for the "Smart Sync" hybrid strategy to work.

begin;

-- 1. Remove tables first to ensure idempotency (optional but safe)
-- alter publication supabase_realtime drop table if exists cases, case_files, notifications, audit_logs;

-- 2. Add Tables to Publication
-- This allows clients to listen to INSERT/UPDATE/DELETE events on these tables.
-- RLS policies will still filter the events!
alter publication supabase_realtime add table cases;
alter publication supabase_realtime add table case_files;
alter publication supabase_realtime add table notifications;
-- audit_logs is high volume, only add if strictly needed for dashboard feed
alter publication supabase_realtime add table audit_logs;

commit;

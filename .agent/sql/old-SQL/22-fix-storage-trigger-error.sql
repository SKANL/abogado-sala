-- 22-fix-storage-trigger-error.sql
-- Description: Drops incorrect triggers on storage.objects that reference 'org_id'.
-- This fixes the error: record "new" has no field "org_id" during file uploads.

-- 1. Drop known incorrect triggers on storage.objects
-- These triggers belong on application tables (like case_files), not system tables.
DROP TRIGGER IF EXISTS tr_track_storage_usage ON storage.objects;
DROP TRIGGER IF EXISTS tr_audit_storage ON storage.objects;
DROP TRIGGER IF EXISTS tr_check_org_quotas ON storage.objects;
DROP TRIGGER IF EXISTS check_org_quotas ON storage.objects;

-- 2. Verify no remaining triggers on storage.objects that use org_id (Optional Manual Check)
-- SELECT event_object_table, trigger_name 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'objects' 
-- AND event_object_schema = 'storage';

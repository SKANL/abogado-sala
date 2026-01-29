-- 18-grant-rpc-permissions.sql
-- Description: Grants execute permissions to portal (anon) and verified users for the file upload confirmation RPC.
-- Fixes "permission denied for function confirm_file_upload" error in Portal.

GRANT EXECUTE ON FUNCTION public.confirm_file_upload(uuid, bigint, text) TO anon;
GRANT EXECUTE ON FUNCTION public.confirm_file_upload(uuid, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_file_upload(uuid, bigint, text) TO service_role;

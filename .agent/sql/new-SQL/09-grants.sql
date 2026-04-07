-- ============================================================
-- 09-grants.sql
-- Permisos para RPCs y funciones públicas
-- Ejecutar DESPUÉS de 04-functions.sql
-- ============================================================

-- ── Permisos para usuario anon (portal público) ───────────────
-- El portal de documentos no requiere login de Supabase,
-- solo un token de caso válido.

GRANT EXECUTE ON FUNCTION public.get_case_by_token(text)               TO anon;
GRANT EXECUTE ON FUNCTION public.get_case_updates_by_token(text)        TO anon;
GRANT EXECUTE ON FUNCTION public.get_case_validation(text)              TO anon;
GRANT EXECUTE ON FUNCTION public.update_case_progress(text, integer)    TO anon;
GRANT EXECUTE ON FUNCTION public.flag_file_exception(text, uuid, text)  TO anon;
GRANT EXECUTE ON FUNCTION public.confirm_file_upload_portal(text, uuid, text, bigint) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_questionnaire_answers(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.log_portal_access(text, text, integer, jsonb) TO anon;

-- ── Permisos para usuario authenticated ──────────────────────
GRANT EXECUTE ON FUNCTION public.get_invitation(text)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_members_with_email(uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_file_upload(uuid, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_case_token(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_org_member(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer, integer) TO authenticated;

-- delete_organization: solo owners (la función hace la verificación interna)
-- ⚠️ IMPORTANTE: Revocar acceso general ANTES del GRANT específico
REVOKE ALL ON FUNCTION public.delete_organization(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_organization(uuid) TO authenticated;

-- ── Permisos para service_role (webhooks, crons) ─────────────
GRANT EXECUTE ON FUNCTION public.expire_trialing_organizations()        TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_files_for_case(uuid, uuid, jsonb) TO service_role;

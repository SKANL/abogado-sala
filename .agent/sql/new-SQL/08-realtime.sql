-- ============================================================
-- 08-realtime.sql
-- Habilitación de Realtime para tablas del proyecto abogado-sala
-- Ejecutar DESPUÉS de 02-tables.sql
-- ============================================================
-- ESTADO SINCRONIZADO CON PRODUCCIÓN (2026-04-05):
-- Tablas activas en supabase_realtime: audit_logs, case_files, cases, notifications
-- ============================================================

-- Habilitar publicación de cambios en tiempo real
-- Estas tablas necesitan replicación lógica para Realtime

-- Notificaciones (para el badge de notificaciones en el dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Casos (para actualizaciones de estado visibles en listas)
ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;

-- Archivos de caso (para actualizaciones de estado en tiempo real en el portal)
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_files;

-- Audit logs (para monitoreo en tiempo real de actividad)
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;

-- NOTA: La tabla 'jobs' apareció en versiones anteriores del README pero
-- NO está en la publicación de producción actual (verificado 2026-04-05).
-- Si se requiere, agregar con:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;

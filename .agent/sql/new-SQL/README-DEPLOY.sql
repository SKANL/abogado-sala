-- ============================================================
-- README-DEPLOY.sql  (guardado como SQL comentado para referencia)
-- GUÍA DE DESPLIEGUE DE LA BASE DE DATOS
-- Proyecto: abogado-sala
-- Última revisión: 2026-04-05 (auditado con MCP Supabase vs producción zhmkfftbvwvuqpekfvrx)
-- ============================================================

/*
# 🚀 Guía de Despliegue — Base de Datos abogado-sala

## Orden de ejecución obligatorio

Ejecuta los archivos SQL EN ESTE ORDEN exacto en el SQL Editor del nuevo proyecto Supabase:

1. `00-extensions.sql`   → Extensiones (pg_trgm, vector, http, pg_net)
2. `01-enums.sql`        → Tipos ENUM personalizados (10 tipos)
3. `02-tables.sql`       → Tablas + plan_configs seed data (19 tablas)
4. `03-indexes.sql`      → Índices de rendimiento
5. `04-functions.sql`    → Funciones auxiliares y RPCs (~25 funciones)
6. `05-triggers.sql`     → Triggers (depende de functions)
7. `06-rls.sql`          → Row Level Security (depende de functions)
8. `07-storage.sql`      → Buckets (case-files, organization-assets, zip-exports) y políticas
9. `08-realtime.sql`     → Publicación de Realtime
10. `09-grants.sql`      → Permisos de ejecución de RPCs

## ⚠️ PASO OBLIGATORIO ANTES DE EJECUTAR 04-functions.sql

En `04-functions.sql`, busca la función `trigger_process_zip_job` y reemplaza:

  '<TU_PROJECT_ID>'

... con el Reference ID real de tu nuevo proyecto Supabase.
Lo encuentras en: Dashboard → Settings → General → Reference ID

Ejemplo:
  'https://abcdefghijklm.supabase.co/functions/v1/process-zip-job'

## Tablas creadas (19 total)

| Tabla                  | RLS | Descripción                              |
|------------------------|-----|------------------------------------------|
| organizations          | ✅  | Firmas de abogados                       |
| plan_configs           | ✅  | Límites por plan (seed incluido)         |
| profiles               | ✅  | Usuarios del sistema (extiende auth)     |
| subscriptions          | ✅  | Suscripciones Stripe                     |
| invitations            | ✅  | Invitaciones por email                   |
| clients                | ✅  | Clientes de la firma                     |
| templates              | ✅  | Plantillas de expediente                 |
| cases                  | ✅  | Expedientes/casos                        |
| case_files             | ✅  | Archivos de cada caso                    |
| case_notes             | ✅  | Notas privadas por caso                  |
| case_updates           | ✅  | Actualizaciones visibles en portal       |
| audit_logs             | ✅  | Auditoría de acciones                    |
| notifications          | ✅  | Notificaciones en app                    |
| portal_analytics       | ✅  | Analítica del portal del cliente         |
| jobs                   | ✅  | Jobs async (zip export, etc.)            |
| tasks                  | ✅  | Tareas por caso                          |
| deletion_requests      | ✅  | Solicitudes de borrado (GDPR)            |
| storage_delete_queue   | ✅  | Cola de eliminación física en Storage    |
| rate_limits            | ✅  | Token bucket para rate limiting          |

## Pasos adicionales manuales en el dashboard de Supabase

### 1. Auth — Configuración recomendada
- Habilitar "Leaked Password Protection" en Authentication → Settings
- Confirmar el sitio URL y redirect URLs en Auth → URL Configuration

### 2. Edge Functions
Desplegar desde el directorio `supabase/functions/`:
- `process-zip-job`: Procesamiento async de exportaciones ZIP de expedientes

### 3. Variables de entorno (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://<TU_PROJECT_ID>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
```

## ✅ Estado sincronizado con producción (2026-04-05)

### Políticas RLS — notas sobre roles
Las políticas SIN `TO <role>` se aplican a `{public}` (todos los roles en Postgres).
Esto coincide exactamente con el estado real de la BD en Supabase (Project: zhmkfftbvwvuqpekfvrx).

Tablas con políticas sin restricción de rol explícita (aplican a {public}):
  - organizations, plan_configs, profiles, invitations
  - clients, templates, cases, case_files, case_updates
  - audit_logs (INSERT), notifications, portal_analytics
  - jobs, tasks, deletion_requests

Tablas con `TO authenticated` (restricción explícita):
  - case_notes (4 políticas: select/insert/update/delete)
  - (Nota: audit_logs SELECT y INSERT usan {public} → creadas SIN TO, confirmado 2026-04-05)
  - clients (Members can insert) → sin TO (coincide con producción)

### Correcciones históricas aplicadas (vs. migraciones incrementales)

1. ✅ `app_is_client()` → `SET search_path = public` (security hardening)
2. ✅ `app_get_client_id()` → `SET search_path = public` (security hardening)
3. ✅ `get_invitation()` → `SECURITY INVOKER` (coincide con producción)
4. ✅ `update_case_notes_updated_at()` → `SECURITY INVOKER` (coincide con producción)
5. ✅ Todas las funciones protegidas con `SET search_path = public`
6. ✅ `cases SELECT/UPDATE` incluye `created_by = auth.uid()` (migración _005)
7. ✅ `cases INSERT` — cualquier miembro activo puede crear (migración _005)
8. ✅ `tasks` RLS usa JWT claims directamente (performance, sin DB round-trip)
9. ✅ `clients` — `Members can insert clients` sin `TO authenticated` (coincide con {public} en BD real)
10. ✅ `deletion_requests` FKs apuntan a `profiles` (migración _007)
11. ✅ `07-storage.sql` actualizado con 3 buckets de producción:
    - `case-files` (privado, 50 MB, acceso staff+portal)
    - `organization-assets` (público, sin límite, logos de org)
    - `zip-exports` (privado, 1 GB, solo service_role)
12. ✅ `09-grants.sql` con REVOKE explícito de `delete_organization` para anon/public
13. ✅ Auditado 2026-04-05: `audit_logs` SELECT/INSERT usan {public} (sin TO) — corregido en 06-rls.sql
14. ✅ Auditado 2026-04-05: `set_updated_at()` es SECURITY INVOKER (no DEFINER) — corregido en 04-functions.sql
15. ✅ Auditado 2026-04-05: `update_tasks_updated_at()` es SECURITY INVOKER — corregido en 04-functions.sql
16. ✅ Auditado 2026-04-05: `queue_storage_deletion()` usa bucket `'case-files'` (no `'secure-docs'`) — corregido en 04-functions.sql

## Verificación post-despliegue

Copiar y ejecutar en el SQL Editor del nuevo proyecto:

```sql
-- 1. Verificar que las 19 tablas existen
SELECT count(*) AS total_tables 
FROM pg_tables 
WHERE schemaname = 'public';
-- Esperado: 19

-- 2. Verificar RLS habilitado en TODAS las tablas (resultado debe ser vacío)
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
-- Esperado: 0 filas

-- 3. Contar políticas RLS
SELECT count(*) AS total_policies 
FROM pg_policies 
WHERE schemaname = 'public';
-- Esperado: 54 políticas (verificado en producción 2026-04-05)

-- 4. Verificar plan_configs seed data
SELECT * FROM public.plan_configs ORDER BY plan;
-- Esperado: 4 filas (trial, pro, enterprise, demo)

-- 5. Verificar funciones críticas
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN (
  'app_get_org_id', 'app_is_admin', 'app_is_active', 'app_is_owner',
  'app_is_client', 'app_get_client_id', 'handle_new_user', 'log_activity',
  'sync_claims_to_auth', 'check_org_quotas', 'check_rate_limit',
  'get_case_by_token', 'get_case_updates_by_token', 'get_org_members_with_email',
  'delete_organization', 'remove_org_member', 'expire_trialing_organizations'
)
ORDER BY proname;
-- Esperado: 17 funciones

-- 6. Verificar buckets de storage
SELECT id, name, public FROM storage.buckets
WHERE id IN ('case-files', 'organization-assets', 'zip-exports');
-- Esperado: 3 filas

-- 7. Contar políticas de storage
SELECT count(*) FROM pg_policies WHERE schemaname = 'storage';
-- Esperado: 9 políticas

-- 8. Verificar triggers críticos
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_schema IN ('public', 'auth')
ORDER BY event_object_table, trigger_name;
-- Esperado: ~17 triggers (incluyendo on_auth_user_created en auth.users)

-- 9. Verificar política de jwt en tasks (debe usar ->> 'org_id' directo)
SELECT policyname, qual FROM pg_policies 
WHERE tablename = 'tasks' AND schemaname = 'public'
ORDER BY policyname;
-- Esperado: 4 políticas (tasks_select, tasks_insert, tasks_update, tasks_delete)
```

## Comparación de migraciones vs new-SQL

Los archivos new-SQL representan el estado FINAL acumulado de todas las migraciones:

| Migración | Descripción | Incluido en new-SQL |
|-----------|-------------|---------------------|
| 20250224  | add_template_id_to_cases | ✅ 02-tables.sql |
| 20260208  | remote_schema (base) | ✅ Todos los archivos |
| 20260228_000 | add_case_notes_and_consent | ✅ case_notes en 02-tables.sql |
| 20260228_001 | add_assigned_to_cases | ✅ assigned_to en cases |
| 20260301_000 | add_get_org_members_with_email | ✅ 04-functions.sql |
| 20260301_001 | add_owner_role | ✅ 01-enums.sql (owner en user_role) |
| 20260301_002 | backfill_owner_role | ⚠️ Solo data migration, no hay new-SQL |
| 20260301_003 | add_delete_organization | ✅ 04-functions.sql |
| 20260301_004 | add_expired_plan_status | ✅ 01-enums.sql (expired en plan_status) |
| 20260301_005 | expire_trial_logic | ✅ 04-functions.sql |
| 20260301_006 | fix_case_notes_rls | ✅ 06-rls.sql (case_notes_*) |
| 20260304_000 | security_performance_hardening | ✅ 04-functions.sql (SET search_path) |
| 20260304_001 | create_on_auth_user_created_trigger | ✅ 05-triggers.sql |
| 20260304_002 | fix_get_org_members_with_email | ✅ 04-functions.sql |
| 20260304_005 | cases_created_by_and_member_visibility | ✅ 06-rls.sql (created_by) |
| 20260304_006 | deletion_requests_and_clients_visibility | ✅ 06-rls.sql + 02-tables.sql |
| 20260304_007 | fix_deletion_requests_fk | ✅ 02-tables.sql (fk a profiles) |
| 20260304_008 | add_whatsapp_template | ✅ 02-tables.sql (whatsapp_template) |
| 20260304_009 | sprint_a_portal_enhancements | ✅ case_updates, review_note, etc. |
| 20260304_010 | sprint_b_client_accounts | ✅ auth_user_id en clients |
| 20260304_011 | sprint_c_tasks | ✅ 02-tables.sql + 06-rls.sql (tasks) |

### ⚠️ Nota sobre backfill (20260301_002)
La migración `backfill_owner_role` asigna el rol 'owner' al primer admin de cada org existente.
En un nuevo proyecto esto no es necesario — el primer usuario que cree una org debe ser 
asignado manualmente como 'owner' a través de la función `sync_claims_to_auth`.
*/

-- Este archivo es solo documentación. No contiene SQL ejecutable adicional.
SELECT 'README-DEPLOY cargado correctamente. Ver comentarios arriba para instrucciones.' AS status;

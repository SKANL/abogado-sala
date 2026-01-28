# 🔬 Exhaustive Module-by-Module Backend Audit v2

**Fecha**: 2026-01-28
**Tipo**: Auditoría Crítica (Mentalidad de Evaluador Estricto)
**Objetivo**: Encontrar TODOS los errores no detectados previamente

---

## 🚨 RESUMEN: 18 NUEVOS ERRORES DETECTADOS

| Severidad | Cantidad | Impacto |
|-----------|----------|---------|
| 🔴 Crítico | 6 | Sistema crashea o datos corruptos |
| 🟠 Alto | 7 | Seguridad comprometida o UX rota |
| 🟡 Medio | 5 | Inconsistencias o deuda técnica |

---

## 🔴 ERRORES CRÍTICOS (6)

### C1. `handle_new_user` inserta NULL en columna NOT NULL
**Archivo**: `04-triggers.sql:11-14`
**Problema**: El trigger intenta insertar `org_id = NULL`, pero `profiles.org_id` está definido como `NOT NULL` en `01-tables.sql:22`.
```sql
-- Trigger dice:
org_id uuid not null references organizations(id) -- L22

-- Pero inserta:
NULL, -- Org ID should be assigned via Invitation
```
**Resultado**: El trigger SIEMPRE fallará con error de constraint.
**Fix**: Cambiar `org_id` a nullable O manejar esto en Server Action, no en trigger.

---

### C2. `update_storage_usage` retorna NEW en DELETE
**Archivo**: `04-triggers.sql:183`
**Problema**: En operación DELETE, `NEW` es NULL. Retornar NULL cancela el DELETE.
```sql
return new; -- Línea 183: Debería ser 'return old' para DELETE
```
**Resultado**: Los archivos no se pueden borrar de la tabla `case_files`.

---

### C3. Tipo `app_role` no existe (Referencia inválida)
**Archivo**: `05-functions.sql:14`
**Problema**: La función `remove_org_member` declara `v_target_role app_role`, pero el tipo definido es `user_role`.
```sql
v_target_role app_role; -- ERROR: type "app_role" does not exist
```
**Fix**: Cambiar a `user_role`.

---

### C4. Falta política INSERT para `cases`
**Archivo**: `03-rls.sql:60-70`
**Problema**: Solo existe `for all` policy que usa `using()`. Para INSERT se requiere `with check()`.
```sql
create policy "Access Cases"
  on cases for all
  using (...) -- ❌ No cubre INSERT
```
**Resultado**: Nadie puede crear casos nuevos (INSERT bloqueado por RLS).

---

### C5. Falta política SELECT para `portal_analytics`
**Archivo**: `03-rls.sql:146-148`
**Problema**: Solo existe política INSERT, no SELECT.
```sql
create policy "Public insert portal analytics"
  on portal_analytics for insert
  -- ❌ No hay SELECT policy
```
**Resultado**: Admins NO pueden ver sus propias analíticas del portal.

---

### C6. Enum mismatch: Zod usa `closed`, SQL usa `archived`
**Archivo**: `backend-contracts.md:68` vs `00-init.sql:12`
**Problema**: 
```typescript
// Zod schema dice:
status: z.enum(["prospect", "active", "closed"]) // 'closed'

// SQL enum dice:
create type client_status as enum ('prospect', 'active', 'archived'); // 'archived'
```
**Resultado**: Validación pasa en frontend, falla en DB insert.

---

## 🟠 ERRORES ALTOS (7)

### H1. Trial expiration no se valida automáticamente
**Archivo**: `01-tables.sql:12`
**Problema**: Existe columna `trial_ends_at` pero:
- No hay trigger que cambie `plan_status` a `canceled` cuando expira.
- No hay cron job documentado para esto.
**Resultado**: Trials nunca expiran automáticamente.

---

### H2. Falta tabla `plan_configs` (Límites hardcoded)
**Archivo**: `04-triggers.sql:54-58`
**Problema**: Diseño recomienda tabla de configuración, pero no existe.
```sql
v_limit := case v_plan_tier 
  when 'trial' then 10 
  when 'pro' then 1000 -- ⚠️ Hardcoded
```
**Impacto**: Cambiar límites requiere migración.

---

### H3. Falta tabla `notifications` (Realtime persistente)
**Archivo**: `realtime-strategy.md:19-22`
**Problema**: El diseño REQUIERE tabla `notifications` para persistir eventos, pero no existe en `01-tables.sql`.
**Resultado**: Feed de actividad es transiente (se pierde si usuario está offline).

---

### H4. No hay política para que Members LEAN sus propios audit_logs
**Archivo**: `03-rls.sql:122-124`
**Problema**: Solo Admin puede ver audit logs.
**Diseño dice**: "Members should see their own activity".
**Impacto**: Lawyers no pueden ver su historial de acciones.

---

### H5. Falta índice en `invitations.email`
**Archivo**: `02-indexes.sql`
**Problema**: La validación "¿ya existe invitación para este email?" requiere index.
```sql
-- Missing:
create index invitations_email_idx on invitations(email);
```
**Impacto**: Query lenta en organizaciones grandes.

---

### H6. Falta índice en `portal_analytics`
**Archivo**: `02-indexes.sql`
**Problema**: Ya detectado pero confirmado. Faltan:
```sql
create index portal_analytics_case_id_idx on portal_analytics(case_id);
create index portal_analytics_created_at_idx on portal_analytics(created_at desc);
```

---

### H7. `templates.owner_id` sin ON DELETE behavior
**Archivo**: `01-tables.sql:77`
**Problema**: Si se borra un profile, las templates quedan huérfanas o crashean.
```sql
owner_id uuid not null references profiles(id), -- ❌ Sin ON DELETE
```
**Fix**: Agregar `ON DELETE SET NULL` y hacer `owner_id` nullable, o `CASCADE`.

---

## 🟡 ERRORES MEDIOS (5)

### M1. Columna `role` en `profiles` usa `user_role`, no `app_role`
**Problema**: Inconsistencia de nombres entre docs y código.
**Impacto**: Confusión de desarrolladores.

---

### M2. `cases.token` generación no especificada
**Problema**: ¿Quién genera el token único? ¿Trigger? ¿Server Action?
**Riesgo**: Colisiones si no se usa UUID o criptografía.

---

### M3. `subscriptions.status` es `text`, no enum
**Archivo**: `01-tables.sql:117`
**Problema**: Debería ser enum para consistencia.
```sql
status text not null, -- Debería ser subscription_status enum
```

---

### M4. `backend-contracts.md` referencia tabla `users` que no existe
**Archivo**: `backend-contracts.md:22`
```sql
WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
-- ❌ La tabla se llama 'profiles', no 'users'
```

---

### M5. Falta constraint CHECK en `storage_used`
**Problema**: Nada impide valores negativos.
```sql
storage_used bigint not null default 0,
-- Debería tener: CHECK (storage_used >= 0)
```

---

## 📋 RESUMEN POR MÓDULO

| Módulo | Críticos | Altos | Medios |
|--------|----------|-------|--------|
| Auth & Identity | 1 | 0 | 1 |
| Foundation (Tables) | 2 | 2 | 2 |
| Admin (RLS) | 1 | 1 | 0 |
| Billing | 0 | 2 | 1 |
| Storage/Ops | 1 | 1 | 1 |
| Portal | 1 | 1 | 0 |
| **TOTAL** | **6** | **7** | **5** |

---

## ✅ PRÓXIMOS PASOS

1. **Inmediato**: Corregir los 6 errores CRÍTICOS antes de cualquier implementación.
2. **Antes de MVP**: Resolver los 7 errores ALTOS.
3. **Deuda Técnica**: Abordar los 5 MEDIOS en un sprint de limpieza.

**¿Desea que genere los parches SQL corregidos?**

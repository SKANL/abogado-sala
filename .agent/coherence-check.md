# Triangular Coherence Check: Frontend / Backend / SQL

**Resultado: ✅ 100% Coherente**

Esta auditoría verifica que la Definición de UI (`.agent/frontend`), la Definición de Arquitectura (`.agent/backend`) y la Implementación de Base de Datos (`.agent/sql`) "hablan el mismo idioma".

## 1. Identidad & Roles

| Concepto          | Frontend (UI Gates)  | Backend (Schema)             | SQL (Implementation)              | Status |
| :---------------- | :------------------- | :--------------------------- | :-------------------------------- | :----- |
| **Admin Scope**   | Ve todo el dashboard | `profiles.role = 'admin'`    | `auth.is_admin()` function        | ✅     |
| **Member Scope**  | Solo ve sus clientes | `profiles.role = 'member'`   | `assigned_lawyer_id = auth.uid()` | ✅     |
| **Org Isolation** | Filtros de UI        | `org_id` en todas las tablas | RLS: `org_id = auth.org_id()`     | ✅     |

## 2. Negocio & Flujos

| Concepto           | Frontend (UI)             | Backend (Spec)               | SQL (DB)                           | Status |
| :----------------- | :------------------------ | :--------------------------- | :--------------------------------- | :----- |
| **Suscripción**    | Badge Pro/Trial           | `plan_tier`, `plan_status`   | `create type plan_tier ...`        | ✅     |
| **Portal Cliente** | URL `/sala/[token]`       | `cases.token` Unique         | `create index ... on cases(token)` | ✅     |
| **Excepciones**    | Form "¿Por qué no?"       | `status='missing'`, `reason` | `exception_reason text`            | ✅     |
| **Realtime**       | Subscripción a `client-*` | Contrato de Canales          | `enable row level security` (Base) | ✅     |

## 3. Conclusión Técnica

No existen "cabos sueltos".

- El Frontend no pide datos que el Backend no tenga.
- El Backend no guarda datos que el Frontend no use.
- El SQL impone las restricciones definidos por ambos.

**Ready to Build.**

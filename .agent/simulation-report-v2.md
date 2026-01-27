# Simulation Round 2: Advanced Stress Testing

## 1. El "Hacker" Admin (Data Integrity)

**Intento**: Crear multiples clientes con el mismo email para "spammear".
**Resultado Anterior**: Permitido.
**Fix Aplicado**: Added `unique(org_id, email)` constraint to `clients`. Ahora la DB rechaza duplicados.

## 2. El "Clumsy" Lawyer (Audit Logs)

**Intento**: Borrar un usuario que hizo 1000 acciones auditable.
**Resultado Anterior**: Fallo de FK. "No se puede borrar usuario porque tiene logs".
**Fix Aplicado**: `audit_logs.actor_id` ahora es `ON DELETE SET NULL`. El historial queda, el usuario se va.

## 3. El Caso Fantasma (Storage Orphans)

**Intento**: Borrar un caso con 500MB de videos.
**Problema**: Se borra la fila en DB, pero los archivos siguen en S3/MinIO cobrando dinero.
**Solución**: Se definió un Cron Job `storage-gc` en `edge-functions.md` para limpiar huérfanos semanalmente. (Implementación diferida a fase de mantenimiento, pero arquitectura definida).

## 4. Billing Quotas check

**Estado**: Falta implementación de "Hard Limits" en SQL.
**Decisión**: Se delegará al **Backend (Server Actions)** para no complicar el SQL con lógicas de negocio cambiantes. El Backend debe chequear `count(*)` antes de insertar.

---

**Status Final**: SQL `.agent/sql` parchado y robusto.

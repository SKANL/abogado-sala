# SaaS "War Games" Simulation Report

Simulación de uso intensivo para encontrar puntos de fallo antes de escribir código UI.

## 1. Escenario: El Despido (User Deletion)

**Acción**: El Owner decide "despedir" al Abogado Juan. Va al panel de usuarios y elimina la cuenta de Juan.
**Resultado Esperado**: Se borra el acceso de Juan. Sus clientes quedan en el sistema, "huerfanos" de asignación, listos para reasignar.
**Resultado Real (SQL Actual)**: 💥 **Error 500**.
**Causa**: La tabla `clients` tiene una FK `assigned_lawyer_id` referenciando a `profiles(id)`.
En `01-tables.sql`, esta FK **no tiene** `ON DELETE SET NULL`.
Por defecto, Postgres impide borrar el perfil si hay clientes que lo referencian.
**Fix Requerido**: Agregar `ON DELETE SET NULL` a la columna `clients.assigned_lawyer_id`.

## 2. Escenario: El Cliente Sube Documentos (Storage Permissions)

**Acción**: El Cliente entra al Portal (`/sala/xyz-123`), arrastra su PDF de DNI.
**Contexto**: El Cliente es un usuario **Anónimo** (No tiene cuenta, solo Token).
**Mecanismo**: El Frontend intenta subir directo a Storage (`supabase.storage.from('docs').upload(...)`).
**Policy de Storage**: Verifica si el usuario tiene permiso sobre el `case`.
**Resultado Real (SQL Actual)**: 🚫 **Access Denied**.
**Causa**: La RLS de la tabla `cases` (`03-rls.sql`) dice:
`USING (auth.uid() = ...)`
Para el usuario anónimo, `auth.uid()` es `null`. La policy evalúa `false`.
Al fallar la lectura de `cases`, la Policy de Storage (que depende de ella) falla.
**Fix Requerido**:

- **Opción A (Recomendada)**: Usar Edge Function para generar **Signed Upload URLs**. El cliente no sube directo, pide permiso al server.
- **Opción B (Insegura)**: Abrir la lectura de `cases` a `anon` usando el token (Hard).

## 3. Escenario: El Abogado "Freelance" (Multi-Org)

**Acción**: El Abogado Pedro trabaja para "Bufete A". Ahora "Bufete B" también quiere contratarlo y usar el software. Le mandan invitación a su mismo email.
**Resultado Real (SQL Actual)**: 🔒 **Bloqueo**.
**Causa**: La tabla `profiles` tiene `id` como PK y FK a `auth.users(id)`.
Es una relación **1:1**.
Un usuario (`auth.users`) solo puede tener UN perfil, y por ende, UN `org_id`.
Si Pedro acepta la invitación de B, tendría que pisar su `org_id`, perdiendo acceso a A.
**Veredicto**: ¿Es esto un Bug o un Feature?

- Para este MVP SaaS, suele ser aceptable que "Un email = Una cuenta por Org". Si Pedro quiere trabajar en dos lados, usa alias (`pedro+b@gmail.com`).
- **Decisión**: Se mantiene como "Known Constraint" del modelo actual.

## 4. Escenario: Expiración del Portal

**Acción**: Un caso terminado hace 2 años. Alguien encuentra el link en WhatsApp y entra.
**Resultado**: Entra y ve todo.
**Causa**: No existe campo `expires_at` en `cases`, y no hay lógica que impida ver un `case` con `status = 'completed'`.
**Riesgo**: Privacidad.
**Fix Requerido**: Agregar política o check en Frontend: Si `status == 'completed'`, mostrar "Este expediente está cerrado".

---

## Plan de Acción Inmediato

Necesitamos parchear el SQL antes de construir el backend definitivo.

1.  Modificar `01-tables.sql`: `clients.assigned_lawyer_id` -> `ON DELETE SET NULL`.
2.  Desarrollar Feature: **Edge Function para Uploads** (Ya estaba en planes, pero ahora es crítica, no opcional).
3.  Modificar `security-model.md`: Aclarar que el Guest no usa RLS directo para uploads.

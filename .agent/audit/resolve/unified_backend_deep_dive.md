# 🕵️‍♂️ Unified Backend Deep Dive Analysis (All Modules)

**Fecha**: 2026-01-28
**Alcance**: Auditoría Completa de Lógica, Flujo y Diseño (Módulos 1-8).
**Estado**: **12 Errores Lógicos Críticos** Detectados (No de código, sino de diseño/flujo).

---

## 🏗️ Parte 1: Módulo 1 (Auth & Identity) - Flujos Críticos

### 1.1 The "Orphan Profile" Trap (Trigger Disabled)
*   **Fuente**: `04-triggers.sql` línea 28.
*   **Estado**: El trigger `on_auth_user_created` está **COMENTADO**.
*   **Riesgo**: Si el frontend falla después del `signUp`, el usuario queda creado en Auth pero sin Perfil.
*   **Impacto**: Crash inmediato al intentar entrar al Dashboard (`profile is null`).
*   **Solución**: Habilitar Trigger o garantizar atomicidad en Server Action.

### 1.2 The "Optimization Illusion" (JWT Latency)
*   **Fuente**: `security-model.md` vs `04-triggers.sql`.
*   **Promesa**: "Leemos `org_id` del JWT para evitar queries a DB".
*   **Realidad**: El primer JWT del usuario tiene `org_id: null`. Al crear la Org, el JWT no se refresca solo.
*   **Impacto**: La optimización falla para el 100% de los usuarios nuevos.
*   **Solución**: Force Token Refresh post-onboarding.

### 1.3 Invitation Security Hole (Double-Link Attack)
*   **Escenario**: Un atacante logueado con `hacker@gmail.com` abre un link destinado a `victima@empresa.com`.
*   **Brecha**: Si el backend solo valida el token, asigna la invitación al hacker.
*   **Solución**: Validar `current_user.email == invitation.email`.

### 1.4 Admin Lockout Paradox
*   **Escenario**: Downgrade de Plan Pro (2 Admins) a Free (1 Admin).
*   **Bloqueo**: Trigger `prevent_last_admin_delete` protege a los admins -> Billing intenta despromover -> Bloqueo Mutuo.

---

## 🏗️ Parte 2: Módulos 2-8 (Ops, Admin, Portal)

### 2.1 The "Zombie User" Removal Gap (Foundation)
*   **Fuente**: `05-functions.sql` -> función `remove_org_member`.
*   **Error**: SQL borra el Perfil, pero **Supabase Auth User sigue vivo**.
*   **Impacto**: "Soft Ban" en lugar de bloqueo real. Usuario sigue consumiendo recursos.
*   **Solución**: Llamada explicita a `supabase.auth.admin.deleteUser()`.

### 2.2 The "Unbranded" Office (Admin)
*   **Error**: Se promete Branding pero faltan columnas en SQL (`logo_url`, `colors`).
*   **Solución**: Migración para agregar columnas de UI.

### 2.3 The "Hardcoded" Billing Limits (Billing)
*   **Error**: Límites (10 clientes, 1000 clientes) quemados en código PL/pgSQL.
*   **Riesgo**: Cambiar precios/planes requiere migración de DB riesgosa.
*   **Solución**: Extraer a tabla de configuración.

### 2.4 The "Blind" Storage Quota (Storage)
*   **Error**: Trigger confía en `file_size` enviado por el cliente.
*   **Exploit**: Subir 1GB, reportar 1KB -> Bypass de cuota.
*   **Solución**: Webhook S3 para validar tamaño real.

### 2.5 The "Ghost Zip" (Ops)
*   **Error**: Descarga masiva es Async, pero no hay tracking de estado.
*   **UX**: Usuario no sabe si su zip está listo o falló.

### 2.6 The "Forever Link" (Portal)
*   **Error**: `expires_at` (30 días) no se revoca si el caso se completa antes.
*   **Riesgo**: Exposición innecesaria de datos post-cierre.

### 2.7 The "Slow Analytics" (Dashboard)
*   **Error**: `portal_analytics` sin índices.
*   **Impacto**: Dashboard lento en producción.
*   **Solución**: Agregar índices.

### 2.8 The "Transient" Feed (Realtime)
*   **Error**: Dependencia exclusiva de WebSockets.
*   **Impacto**: Si no estás conectado, te pierdes la notificación.
*   **Solución**: Tabla `notifications` persistente.

---

## 📝 Resumen Ejecutivo & Próximos Pasos

El sistema tiene **Cimientos SQL Sólidos** (Riesgos de integridad resueltos), pero **12 Deficiencias Lógicas** importantes en el diseño de flujos.

**Recomendación**:
No seguir auditando. detener el análisis.
Pasar a la fase de **Corrección e Implementación**, comenzando por el **Módulo 1 (Auth)** para resolver los bloqueos de registro e invitación.

# 📡 API Contracts Validation Report

**Fecha**: 2026-01-27
**Objetivo**: Validar que los contratos de API estén completos, con endpoints definidos, parámetros validados, y respuestas de error documentadas.

---

## 🚨 HALLAZGO CRÍTICO: Contratos No Existen

El archivo `backend-contracts.md` tiene **solo 64 líneas** y NO contiene contratos de API reales. Solo define:

1. Filosofía de RLS (líneas 6-23)
2. Claims del token (líneas 25-36)
3. Estructura genérica de respuesta (líneas 38-52)
4. Canales Realtime (líneas 54-59)
5. Mención de atomicidad (líneas 61-63)

### ❌ Lo Que FALTA:

| Elemento | Estado |
|----------|--------|
| Lista de Server Actions | ❌ No existe |
| Parámetros de entrada | ❌ No existe |
| Tipos de respuesta | ❌ Solo estructura genérica |
| Códigos de error específicos | ❌ Solo ejemplo genérico |
| Schemas de validación Zod | ❌ No existe |
| Rate limits por endpoint | ❌ No existe |

---

## 📋 Server Actions Implícitas (Inferidas de Documentos)

Analizando todos los documentos del proyecto, he identificado las siguientes Server Actions que el Frontend ESPERA pero NO están formalmente documentadas:

### Module: Auth & Identity

| Server Action | Mencionado En | Input Esperado | Output Esperado | Validación | Errores Definidos |
|---------------|---------------|----------------|-----------------|------------|-------------------|
| `loginAction` | data-fetching-mutations.md:56 | `{ email, password }` | `Result<Session>` | ⚠️ Solo ejemplo | ❌ No |
| `signupAction` | auth-module.md (implícito) | `{ email, password, orgName }` | `Result<User>` | ❌ No | ❌ No |
| `logoutAction` | auth-module.md (implícito) | `void` | `Result<void>` | N/A | ❌ No |
| `inviteMemberAction` | admin-module.md (implícito) | `{ email, role }` | `Result<Invitation>` | ❌ No | ❌ No |
| `acceptInvitationAction` | auth-module.md (implícito) | `{ token, name, password }` | `Result<User>` | ❌ No | ❌ No |
| `resetPasswordAction` | (no mencionado) | `{ email }` | `Result<void>` | ❌ No | ❌ No |
| `updatePasswordAction` | (no mencionado) | `{ currentPassword, newPassword }` | `Result<void>` | ❌ No | ❌ No |

### Module: Clients

| Server Action | Mencionado En | Input Esperado | Output Esperado | Validación | Errores Definidos |
|---------------|---------------|----------------|-----------------|------------|-------------------|
| `createClientAction` | clients-module.md (implícito) | `{ name, email, phone, ... }` | `Result<Client>` | ❌ No | ❌ No |
| `updateClientAction` | (implícito) | `{ id, ...fields }` | `Result<Client>` | ❌ No | ❌ No |
| `deleteClientAction` | (implícito) | `{ id }` | `Result<void>` | ❌ No | ❌ No |
| `reassignClientAction` | (no existe, pero identificado como gap) | `{ clientId, newLawyerId }` | `Result<void>` | ❌ No | ❌ No |
| `archiveClientAction` | (implícito) | `{ id }` | `Result<void>` | ❌ No | ❌ No |

### Module: Cases

| Server Action | Mencionado En | Input Esperado | Output Esperado | Validación | Errores Definidos |
|---------------|---------------|----------------|-----------------|------------|-------------------|
| `createCaseAction` | portal-module.md (implícito) | `{ clientId, templateId }` | `Result<Case>` | ❌ No | ❌ No |
| `updateCaseAction` | (implícito) | `{ id, status, ... }` | `Result<Case>` | ❌ No | ❌ No |
| `getCaseByTokenAction` | portal-module.md (implícito) | `{ token }` | `Result<Case>` | ❌ No | ❌ No |
| `generatePortalLinkAction` | clients-module.md:26 | `{ caseId }` | `Result<{ url, token }>` | ❌ No | ❌ No |
| `revokePortalAction` | (no existe, identificado gap) | `{ caseId }` | `Result<void>` | ❌ No | ❌ No |

### Module: Templates

| Server Action | Mencionado En | Input Esperado | Output Esperado | Validación | Errores Definidos |
|---------------|---------------|----------------|-----------------|------------|-------------------|
| `createTemplateAction` | templates-module.md (implícito) | `{ name, schema }` | `Result<Template>` | ❌ No | ❌ No |
| `updateTemplateAction` | (implícito) | `{ id, schema }` | `Result<Template>` | ❌ No | ❌ No |
| `deleteTemplateAction` | (implícito) | `{ id }` | `Result<void>` | ❌ No | ❌ No |
| `duplicateTemplateAction` | (implícito) | `{ id, newName }` | `Result<Template>` | ❌ No | ❌ No |

### Module: Portal (Public/Anonymous)

| Server Action | Mencionado En | Input Esperado | Output Esperado | Validación | Errores Definidos |
|---------------|---------------|----------------|-----------------|------------|-------------------|
| `getPortalDataAction` | portal-module.md:11 | `{ token }` | `Result<PortalData>` | ❌ No | ❌ No |
| `submitPortalStepAction` | portal-module.md (implícito) | `{ token, stepIndex, data }` | `Result<void>` | ❌ No | ❌ No |
| `generateUploadUrlAction` | security-model.md:68 | `{ token, fileName }` | `Result<{ signedUrl }>` | ❌ No | ❌ No |
| `markFileExceptionAction` | portal-module.md:31 | `{ token, stepIndex, reason }` | `Result<void>` | ❌ No | ❌ No |

### Module: Billing

| Server Action | Mencionado En | Input Esperado | Output Esperado | Validación | Errores Definidos |
|---------------|---------------|----------------|-----------------|------------|-------------------|
| `createCheckoutSessionAction` | billing-module.md (implícito) | `{ planId }` | `Result<{ url }>` | ❌ No | ❌ No |
| `cancelSubscriptionAction` | billing-module.md (implícito) | `void` | `Result<void>` | ❌ No | ❌ No |
| `updatePaymentMethodAction` | (implícito) | `void` → redirect a Stripe | `Result<{ url }>` | ❌ No | ❌ No |
| `handleStripeWebhook` | (Route Handler, no Action) | Stripe Event | `200 OK / 400 Error` | ❌ No | ❌ No |

### Module: Admin/Team

| Server Action | Mencionado En | Input Esperado | Output Esperado | Validación | Errores Definidos |
|---------------|---------------|----------------|-----------------|------------|-------------------|
| `getTeamMembersAction` | admin-module.md (implícito) | `void` | `Result<Profile[]>` | N/A | ❌ No |
| `removeMemberAction` | admin-module.md (implícito) | `{ userId }` | `Result<void>` | ❌ No | ❌ No |
| `updateMemberRoleAction` | (implícito) | `{ userId, role }` | `Result<void>` | ❌ No | ❌ No |
| `updateOrgSettingsAction` | admin-module.md (implícito) | `{ branding, name }` | `Result<void>` | ❌ No | ❌ No |

### Module: Dashboard/Analytics

| Server Action | Mencionado En | Input Esperado | Output Esperado | Validación | Errores Definidos |
|---------------|---------------|----------------|-----------------|------------|-------------------|
| `getDashboardStatsAction` | dashboard-module.md (implícito) | `void` | `Result<Stats>` | N/A | ❌ No |
| `getActivityFeedAction` | realtime-strategy.md:78 | `{ cursor?, limit? }` | `Result<Activity[]>` | ❌ No | ❌ No |
| `magicSearchAction` | dashboard-module.md:37 | `{ query }` | `Result<SearchResult[]>` | ❌ No | ❌ No |

---

## 🔴 Gaps de Validación de Parámetros

### 1. No Hay Schemas Zod Documentados

El documento `data-fetching-mutations.md` dice "Validar FormData con Zod" pero NO provee los schemas.

**Schemas Faltantes**:

| Schema | Campos Esperados | Validaciones Necesarias |
|--------|------------------|------------------------|
| `loginSchema` | email, password | Email válido, password min 8 chars |
| `signupSchema` | email, password, name, orgName | Email único, password strength |
| `clientSchema` | name, email?, phone?, ... | Name required, email/phone format |
| `templateSchema` | name, schema (JSON) | Name unique per org, schema valid JSON |
| `portalStepSchema` | stepIndex, data | StepIndex exists, data matches step type |
| `invitationSchema` | email, role | Email valid, role in ['admin', 'member'] |

### 2. Parámetros Sin Límites

| Parámetro | Problema | Riesgo |
|-----------|----------|--------|
| `clientName` | ¿Max length? | 10,000 chars → DB bloat |
| `templateSchema.steps` | ¿Max steps? | 1000 steps → UI crash |
| `templateSchema.body_rich_text` | ¿Max length? | 10MB de HTML |
| `portalStep.data` | ¿Max size? | JSON de 100MB |
| `search.query` | ¿Max length? | Query de 10,000 chars |
| `file.name` | ¿Allowed chars? | Path traversal |

---

## 🟠 Respuestas de Error No Definidas

### Estructura Definida (pero incompleta):

```json
{
  "success": false,
  "error": "Mensaje amigable",
  "code": "ERROR_CODE"
}
```

### Códigos de Error FALTANTES:

| Situación | Código Sugerido | ¿Definido? |
|-----------|-----------------|------------|
| Usuario no autenticado | `UNAUTHENTICATED` | ❌ No |
| Sin permisos | `FORBIDDEN` | ❌ No |
| Recurso no encontrado | `NOT_FOUND` | ❌ No |
| Validación fallida | `VALIDATION_ERROR` | ❌ No |
| Plan expirado | `PAYMENT_REQUIRED` | ⚠️ Solo ejemplo |
| Límite alcanzado | `LIMIT_REACHED` | ⚠️ Solo ejemplo |
| Token inválido | `INVALID_TOKEN` | ❌ No |
| Token expirado | `TOKEN_EXPIRED` | ❌ No |
| Email ya registrado | `EMAIL_EXISTS` | ❌ No |
| Invitación expirada | `INVITATION_EXPIRED` | ❌ No |
| Caso completado | `CASE_COMPLETED` | ❌ No |
| Archivo muy grande | `FILE_TOO_LARGE` | ❌ No |
| Tipo no permitido | `INVALID_FILE_TYPE` | ❌ No |
| Operación no permitida | `OPERATION_NOT_ALLOWED` | ❌ No |
| Rate limit | `RATE_LIMITED` | ❌ No |
| Servicio no disponible | `SERVICE_UNAVAILABLE` | ❌ No |
| Error de Stripe | `PAYMENT_FAILED` | ❌ No |
| Webhook inválido | `INVALID_WEBHOOK` | ❌ No |

---

## 🟡 Route Handlers No Definidos

El documento dice "No usar Route Handlers para mutaciones", pero hay casos donde son NECESARIOS:

| Endpoint | Propósito | ¿Documentado? |
|----------|-----------|---------------|
| `POST /api/webhooks/stripe` | Procesar eventos de Stripe | ❌ No |
| `POST /api/webhooks/resend` | Bounce/Complaint emails | ❌ No |
| `GET /api/health` | Healthcheck para uptime monitoring | ❌ No |
| `GET /api/cron/expire-trials` | Job de expiración de trials | ❌ No |
| `GET /api/cron/cleanup-drafts` | Limpiar recursos huérfanos | ❌ No |

---

## ⚪ Inconsistencias Entre Documentos

### 1. Respuesta de Error Inconsistente

**data-fetching-mutations.md** (línea 42-44):
```typescript
{ success: false; error: string; validationErrors?: Record<string, string[]> }
```

**backend-contracts.md** (línea 46-51):
```json
{ "success": false, "error": "Mensaje", "code": "ERROR_CODE" }
```

**Problema**: `validationErrors` vs `code` - ¿Cuál es el correcto? ¿Se pueden combinar?

### 2. Claims del Token

**backend-contracts.md** (línea 29-35):
```json
{ "role": "admin" | "member", "org_id": "uuid", "plan_tier": "...", "plan_status": "..." }
```

**Pero** el documento de auth-module.md menciona "member" y "lawyer" indistintamente.

**Problema**: ¿Es `member` o `lawyer`? Los documentos usan ambos.

### 3. Canales Realtime

**backend-contracts.md** (línea 57-59):
```
- client-{clientId}
- org-{orgId}
```

**realtime-strategy.md** menciona:
```
- client-{clientId}
- dashboard-feed
- portal-{caseId}
- presence-{clientId}
```

**Problema**: Los canales no están sincronizados entre documentos.

---

## 📊 Resumen de Gaps

| Categoría | Cantidad | Severidad |
|-----------|----------|-----------|
| Server Actions sin definición formal | 30+ | 🔴 Crítico |
| Schemas Zod no documentados | 10+ | 🔴 Crítico |
| Códigos de error no definidos | 18+ | 🟠 Alto |
| Límites de parámetros faltantes | 6+ | 🟠 Alto |
| Route Handlers no documentados | 5 | 🟡 Medio |
| Inconsistencias entre documentos | 3 | 🟡 Medio |

---

## ✅ Recomendaciones

### 1. Crear Catálogo de Server Actions

```typescript
// lib/contracts/actions.ts
export const SERVER_ACTIONS = {
  // Auth
  'auth/login': {
    input: z.object({ email: z.string().email(), password: z.string().min(8) }),
    output: z.object({ session: SessionSchema }),
    errors: ['INVALID_CREDENTIALS', 'ACCOUNT_LOCKED'],
  },
  // ... para cada action
} as const;
```

### 2. Definir Error Codes Centralizados

```typescript
// lib/contracts/errors.ts
export const ERROR_CODES = {
  UNAUTHENTICATED: { status: 401, message: 'Sesión expirada' },
  FORBIDDEN: { status: 403, message: 'No tienes permisos' },
  NOT_FOUND: { status: 404, message: 'Recurso no encontrado' },
  VALIDATION_ERROR: { status: 400, message: 'Datos inválidos' },
  // ...
} as const;
```

### 3. Documentar Límites

```typescript
// lib/contracts/limits.ts
export const LIMITS = {
  CLIENT_NAME_MAX: 100,
  TEMPLATE_STEPS_MAX: 20,
  RICH_TEXT_MAX: 5000,
  FILE_SIZE_MAX: 10 * 1024 * 1024,
  SEARCH_QUERY_MAX: 100,
} as const;
```

---

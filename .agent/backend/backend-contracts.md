# Backend Contracts & Requirements - Abogado Sala

Este archivo define los **requisitos estrictos** que el Frontend espera del Backend.
El Frontend es el "Cliente" y el Backend es el "Servidor". Aquí definimos el Contrato de Servicio.

---

## 1. Seguridad de Datos (Row Level Security)

El Frontend asume que el Backend **NUNCA** retornará datos fuera del scope permitido, sin importar qué parámetros envíe la UI.

### Contrato de Clientes (`clients`)

```sql
-- REQUISITO BACKEND (Implementation Detail)
-- El backend debe implementar políticas equivalentes a:

-- Para Abogado Empleado (Lawyer):
SELECT * FROM clients
WHERE assigned_lawyer_id = auth.uid()

-- Para Dueño (Owner):
SELECT * FROM clients
WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
```

---

## 2. Definición de Roles (Claims)

El token de sesión (`auth.session`) debe incluir los siguientes Custom Claims para que el Frontend pueda renderizar la UI condicional (Layouts, Menús):

```json
{
  "role": "admin" | "member",
  "org_id": "uuid",
  "plan_tier": "trial" | "pro" | "enterprise" | "demo",
  "plan_status": "active" | "trialing" | "past_due" | "canceled" | "paused"
}
```

---

## 3. Server Actions Registry

Todas las mutaciones deben respetar la interfaz `Result<T>` definida en `frontend/data-fetching-mutations.md`.

### Core Actions

| Action Name                   | Input Schema (Zod)                                  | Output `T`                             | Descripción                                                                                        |
| ----------------------------- | --------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `createClientAction`          | `insertClientSchema`                                | `Client`                               | Crea un nuevo cliente en la organización.                                                          |
| `updateClientAction`          | `updateClientSchema`                                | `Client`                               | Modifica datos del cliente.                                                                        |
| `inviteMemberAction`          | `inviteMemberSchema`                                | `Invitation`                           | Envía invitación por email a un nuevo miembro.                                                     |
| `getInvitationAction`         | `{ token: string }`                                 | `Invitation`                           | Obtiene detalles (Validación Server-Side). Bloqueado por RLS.                                      |
| `getCaseByTokenAction`        | `{ token: string }`                                 | `CasePublic`                           | Obtiene datos públicos del caso para el Portal (RPC `get_case_by_token`).                          |
| `createCaseAction`            | `createCaseSchema`                                  | `Case`                                 | Inicializa un nuevo expediente/sala.                                                               |
| `revokeInvitationAction`      | `{ id: string }`                                    | `void`                                 | Cancela una invitación pendiente.                                                                  |
| `deleteClientAction`          | `{ clientId: string }`                              | `void`                                 | Elimina cliente (Solo si no tiene casos activos - RESTRICT constraint).                            |
| `deleteFileAction`            | `{ fileId: string }`                                | `void`                                 | Marca archivo para borrado asíncrono (`storage_delete_queue`).                                     |
| `flagFileExceptionAction`     | `{ token: string, fileId: string, reason: string }` | `void`                                 | Portal: Marca archivo como "No tengo este documento" (RPC `flag_file_exception`).                  |
| `updateCaseProgressAction`    | `{ token: string, step: number }`                   | `void`                                 | Portal: Guarda el paso actual del Wizard (RPC `update_case_progress`).                             |
| `confirmUploadAction`         | `{ fileId: string, size: number, key: string }`     | `CaseFile`                             | **CRITICAL**: Valida meta en Storage (HEAD), luego llama RPC `confirm_file_upload` (Service Role). |
| `requestZipGenerationAction`  | `{ caseId: string }`                                | `void`                                 | Inicia job asíncrono de generación de ZIP (Notificación al finalizar).                             |
| `markNotificationReadAction`  | `{ notificationIds: string[] }`                     | `void`                                 | Marca notificaciones como leídas (Batch support para Sync eficiente).                              |
| `getOrganizationConfigAction` | `{}`                                                | `{ tier: string, limits: PlanConfig }` | Obtiene configuración y límites de uso del plan actual (Anti-Hardcoding).                          |
| `regenerateCaseTokenAction`   | `{ caseId: string }`                                | `string`                               | Rota el token de acceso al Portal (Seguridad).                                                     |
| `logPortalAccessAction`       | `{ token: string, event: string, step?: number}`    | `void`                                 | Registra analítica de visita (RPC `log_portal_access`).                                            |
| `updateOrganizationAction`    | `{ name?: string, color?: string, logo?: string }`  | `Organization`                         | Modifica branding y datos de la Org. (Requiere RLS Admin).                                         |
| `removeMemberAction`          | `{ userId: string }`                                | `void`                                 | Elimina miembro de la Org (Soft Delete + Auth Ban).                                                |
| `updateCaseAction`            | `updateCaseSchema`                                  | `Case`                                 | Actualiza estado y progreso del caso.                                                              |
| `createStripeCheckoutAction`  | `{ plan: 'pro'                                      | 'enterprise' }`                        | `{ url: string }`                                                                                  | Genera sesión de Checkout de Stripe. |
| `createStripePortalAction`    | `{}`                                                | `{ url: string }`                      | Genera sesión de Customer Portal de Stripe.                                                        |

---

## 4. Schemas de Validación (Zod Definitions)

Estos schemas deben ser compartidos entre Frontend (Validación Form) y Backend (Validación Action).

> **Nota**: `z.string().min(1)` es obligatorio para campos `NOT NULL`.

### `insertClientSchema`

```typescript
z.object({
  full_name: z.string().min(2, "Nombre requerido").max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  assigned_lawyer_id: z.string().uuid().optional(), // Nullable en DB
  status: z.enum(["prospect", "active", "archived"]).default("prospect"),
});
```

### `inviteMemberSchema`

```typescript
z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "member"]).default("member"),
});
```

### `createCaseSchema`

```typescript
z.object({
  client_id: z.string().uuid("Cliente requerido"),
  template_snapshot: z.record(z.any()).optional(), // JSONB
  status: z.enum(["draft", "in_progress"]).default("draft"),
});
```

### `updateCaseSchema`

```typescript
z.object({
  case_id: z.string().uuid(),
  status: z.enum(["draft", "in_progress", "review", "completed"]),
  current_step_index: z.number().int().min(0).optional(),
});
```

---

## 5. Estructura de Respuesta de Error

Si el backend falla, debe retornar:

```json
{
  "success": false,
  "error": "Mensaje amigable para el usuario",
  "code": "ERROR_CODE_FOR_UI_HANDLING"
}
```

### Diccionario de Errores (Standard)

| Código                          | Causa SQL/Lógica                | Acción UI                                         |
| :------------------------------ | :------------------------------ | :------------------------------------------------ |
| `AUTH_UNAUTHORIZED`             | Auth Check Falló                | Redirigir a Login                                 |
| `AUTH_FORBIDDEN`                | RLS Policy / Role Check         | Mostrar "No tienes permisos"                      |
| `AUTH_SUSPENDED`                | RPC `auth.is_active` check      | Redirigir a `/suspended` (Force Logout)           |
| `VAL_NOT_FOUND`                 | `P2025` o `result.length === 0` | Mostrar 404 o Empty State                         |
| `VAL_DUPLICATE_SLUG`            | `P2002` (Unique Constraint)     | "Ya existe un registro con estos datos"           |
| `VAL_DEPENDENCY_EXISTS`         | `P23503` (Foreign Key Restrict) | "No se puede eliminar: tiene registros asociados" |
| `BILLING_QUOTA_CLIENTS`         | Trigger `check_org_quotas`      | Abrir Modal Upgrade                               |
| `BILLING_QUOTA_STORAGE`         | Trigger `update_storage_usage`  | Abrir Modal Upgrade                               |
| `BILLING_SUBSCRIPTION_INACTIVE` | Trigger Guard `active` check    | Redirigir a `/billing` (Paywall)                  |
| `BILLING_TRIAL_EXPIRED`         | Trigger Guard `trial_ends_at`   | Redirigir a `/billing` (Paywall)                  |
| `VAL_INVALID_INPUT`             | Zod Parse Failed                | Resaltar campos en formulario                     |
| `VAL_TOKEN_USED`                | Token no encontrado / Expirado  | "Invitación caducada o inválida"                  |

> **Nota**: Ver `error-dictionary.md` para la referencia completa de códigos.

---

## 6. Realtime Channels

El Frontend espera suscribirse a canales seguros. El backend debe exponer:

- `client-{clientId}`: Eventos de actualización del expediente.
- `org-{orgId}`: Eventos globales (stats, logs).

---

## 7. Transacciones Atómicas (Auth)

## 7. Transacciones Atómicas (Auth)

El registro (`createAccount`) debe ser atómico. Si falla la creación de `org`, no debe crearse el `user`.

> **Implementation Requirement**:
> Debido a que el Claim `org_id` se asigna _después_ del login inicial (via Trigger), el Frontend **DEBE** escuchar el evento `onAuthStateChange` para detectar la actualización del token o forzar `supabase.auth.refreshSession()` inmediatamente después del registro exitoso antes de intentar navegar a rutas protegidas.

---

---

## 8. System Configuration & Webhooks (Hardening)

El backend debe leer los límites de la tabla `plan_configs` (caché en Redis o Memoria) y no hardcodear valores.

### 8.1. Contrato de Webhooks (Billing Integrity)

Para garantizar que `organizations.plan_status` y `trial_ends_at` sean la fuente de verdad confiable, el endpoint `/api/webhooks/stripe` debe implementar:

| Evento Stripe                   | Acción DB en `organizations`                                    | Acción DB en `subscriptions`   |
| :------------------------------ | :-------------------------------------------------------------- | :----------------------------- |
| `customer.subscription.created` | Update `stripe_customer_id` (if null)                           | Insert/Update Subscription     |
| `invoice.payment_succeeded`     | **Set `plan_status` = 'active'**. Extend `current_period_end`   | Update `status`, `periods`     |
| `invoice.payment_failed`        | **Set `plan_status` = 'past_due'**.                             | Update `status`                |
| `customer.subscription.deleted` | **Set `plan_status` = 'canceled'**.                             | Update `status`, `canceled_at` |
| `customer.subscription.updated` | Update `plan_tier` (if product changed). Update `trial_ends_at` | Update `status`, `cancel_at`   |

> **Safety**: El webhook handler debe usar `service_role` y ser idempotente.

---

## 9. Persistent Notifications

Los eventos críticos (Upload, Firma) deben insertarse en la tabla `notifications` (además de enviarse por realtime si el usuario está online).

- Trigger: `INSERT` en `notifications`.
- Client: Fetch inicial de `notifications` no leídas.

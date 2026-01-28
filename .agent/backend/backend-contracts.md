# Backend Contracts & Requirements - Abogado Sala

Este archivo define los **requisitos estrictos** que el Frontend espera del Backend.
El Frontend es el "Cliente" y el Backend es el "Servidor". Aquí definimos el Contrato de Servicio.

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
WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
```

## 2. Definición de Roles (Claims)

El token de sesión (`auth.session`) debe incluir los siguientes Custom Claims para que el Frontend pueda renderizar la UI condicional (Layouts, Menús):

```json
{
  "role": "admin" | "member",
  "org_id": "uuid",
  "plan_tier": "trial" | "pro" | "demo", // [NUEVO] Demo mode support
  "plan_status": "active" | "past_due" | "canceled"
}
```

## 3. Server Actions Registry

Todas las mutaciones deben respetar la interfaz `Result<T>` definida en `frontend/data-fetching-mutations.md`.

### Core Actions

| Action Name              | Input Schema (Zod)   | Output `T`   | Descripción                                                    |
| ------------------------ | -------------------- | ------------ | -------------------------------------------------------------- |
| `createClientAction`     | `insertClientSchema` | `Client`     | Crea un nuevo cliente en la organización.                      |
| `updateClientAction`     | `updateClientSchema` | `Client`     | Modifica datos del cliente.                                    |
| `inviteMemberAction`     | `inviteMemberSchema` | `Invitation` | Envía invitación por email a un nuevo miembro.                 |
| `getInvitationAction`    | `{ token: string }`  | `Invitation` | Obtiene detalles (Validación Server-Side). Bloqueado por RLS.  |
| `createCaseAction`       | `createCaseSchema`   | `Case`       | Inicializa un nuevo expediente/sala.                           |
| `revokeInvitationAction` | `{ id: string }`     | `void`       | Cancela una invitación pendiente.                              |
| `deleteFileAction`       | `{ fileId: string }` | `void`       | Marca archivo para borrado asíncrono (`storage_delete_queue`). |

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
  status: z.enum(["prospect", "active", "closed"]).default("prospect"),
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
  status: z.enum(["draft", "active"]).default("draft"),
});
```

## 5. Estructura de Respuesta de Error

Si el backend falla, debe retornar:

```json
{
  "success": false,
  "error": "Mensaje amigable para el usuario",
  "code": "ERROR_CODE_FOR_UI_HANDLING" // Ejemplo: 'PAYMENT_REQUIRED', 'LIMIT_REACHED'
}
```

## 6. Realtime Channels

El Frontend espera suscribirse a canales seguros. El backend debe exponer:

- `client-{clientId}`: Eventos de actualización del expediente.
- `org-{orgId}`: Eventos globales (stats, logs).

## 7. Transacciones Atómicas (Auth)

El registro (`createAccount`) debe ser atómico. Si falla la creación de `org`, no debe crearse el `user`. La tabla `profiles` se crea automáticamente vía Trigger `on_auth_user_created`.

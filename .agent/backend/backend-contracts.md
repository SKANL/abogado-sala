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

## 3. Server Actions Contracts

Todas las mutaciones deben respetar la interfaz `Result<T>` definida en `frontend/data-fetching-mutations.md`.

### Estructura de Respuesta de Error

Si el backend falla, debe retornar:

```json
{
  "success": false,
  "error": "Mensaje amigable para el usuario",
  "code": "ERROR_CODE_FOR_UI_HANDLING" // Ejemplo: 'PAYMENT_REQUIRED', 'LIMIT_REACHED'
}
```

## 4. Realtime Channels

El Frontend espera suscribirse a canales seguros. El backend debe exponer:

- `client-{clientId}`: Eventos de actualización del expediente.
- `org-{orgId}`: Eventos globales (stats, logs).

## 5. Transacciones Atómicas (Auth)

El registro (`createAccount`) debe ser atómico. Si falla la creación de `org`, no debe crearse el `user`.

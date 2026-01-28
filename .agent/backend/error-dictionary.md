# Error Dictionary - Abogado Sala

Contrato estandarizado de códigos de error (`Result<T>.code`) y su interpretación en UI.

## 1. Authentication & Integrity (`AUTH_`)

| Code                | Message (Internal)                | UI Feedback (Usuario)                | Acción UI                 |
| :------------------ | :-------------------------------- | :----------------------------------- | :------------------------ |
| `AUTH_UNAUTHORIZED` | "Session invalid or missing"      | "Tu sesión ha expirado"              | Redirect `/login`         |
| `AUTH_FORBIDDEN`    | "User role insufficient"          | "No tienes permiso para ver esto"    | Mostrar 403 / Toast Error |
| `AUTH_ORG_MISMATCH` | "Resource belongs to another org" | "Acceso denegado a este recurso"     | Redirect Dashboard        |
| `AUTH_ZOMBIE_TOKEN` | "User deleted or banned"          | "Cuenta deshabilitada"               | Force Logout              |
| `AUTH_SUSPENDED`    | "Soft delete active"              | "Cuenta suspendida temporalmente"    | Redirect `/suspended`     |
| `AUTH_LAST_ADMIN`   | "Cannot delete last admin"        | "No puedes eliminar el último admin" | Toast Error               |

## 2. Billing & Quotas (`BILLING_`)

| Code                      | Message (Internal)             | UI Feedback (Usuario)                            | Acción UI                          |
| :------------------------ | :----------------------------- | :----------------------------------------------- | :--------------------------------- |
| `BILLING_QUOTA_CLIENTS`   | "Active clients quota reached" | "Has alcanzado el límite de clientes de tu plan" | Modal "Upgrade Plan"               |
| `BILLING_QUOTA_STORAGE`   | "Storage limit exceeded"       | "Espacio de almacenamiento lleno (5GB)"          | Modal "Liberar Espacio"            |
| `BILLING_PAST_DUE`        | "Subscription past due"        | "Hay un problema con tu pago"                    | Redirect `/billing`                |
| `BILLING_TRIAL_EXPIRED`   | "Trial period finished"        | "Tu periodo de prueba ha finalizado"             | Redirect `/billing` (Paywall)      |
| `BILLING_DOWNGRADE_BLOCK` | "Usage exceeds target plan"    | "Debes reducir uso antes de bajar de plan"       | Mostrar lista de recursos a borrar |

## 3. Validation & Logic (`VAL_`)

| Code                 | Message (Internal)                     | UI Feedback (Usuario)            | Acción UI               |
| :------------------- | :------------------------------------- | :------------------------------- | :---------------------- |
| `VAL_INVALID_INPUT`  | "Zod parse failed"                     | (Field Errors específicos)       | Resaltar inputs en rojo |
| `VAL_DUPLICATE_SLUG` | "Org slug already taken"               | "Este nombre de URL ya existe"   | Pedir otro nombre       |
| `VAL_TOKEN_USED`     | "Case token already redeemed/finished" | "Este trámite ya fue completado" | Mostrar Pantalla "Done" |

## 4. System & Infrastructure (`SYS_`)

| Code                      | Message (Internal)    | UI Feedback (Usuario)                    | Acción UI                  |
| :------------------------ | :-------------------- | :--------------------------------------- | :------------------------- |
| `SYS_INTERNAL_ERROR`      | "Unhandled exception" | "Ocurrió un error inesperado"            | Botón "Reintentar"         |
| `SYS_RATE_LIMIT`          | "Too many requests"   | "Demasiados intentos, espera un momento" | Deshabilitar botón X seg   |
| `SYS_STORAGE_UPLOAD_FAIL` | "S3 Upload failed"    | "Error al subir documento"               | Opción "Reintentar Subida" |

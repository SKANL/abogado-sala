# 📡 Reporte de Estado de Contratos API (Post-Audit SQL)

**Fecha**: 2026-01-28
**Estado General**: **Cimientos Seguros** 🟢 | **Contratos No Definidos** 🔴
**Referencia**: Validación de gaps en `api_contracts_validation.md`.

---

## 📊 Resumen de Situación

La auditoría de SQL ha proporcionado una "Red de Seguridad" crítica. Aunque los contratos de API no estén escritos, la base de datos ahora **imposibilita** violar ciertas reglas (como crear clientes duplicados o dejar casos sin expiración).

Sin embargo, el documento `backend-contracts.md` sigue estando incompleto. La "Verdad" está en el SQL, pero no en la documentación para el Frontend.

| Categoría | Estado Previo | Estado Actual | Impacto del SQL Audit |
|-----------|---------------|---------------|-----------------------|
| **Seguridad de Datos** | 🔴 Crítico | 🟢 **SEGURO** | Constraints DB fuerzan la validez (ej. `expires_at` NOT NULL). |
| **Documentación API** | 🔴 Crítico | 🔴 **PENDIENTE** | No ha habido cambios en documentos Markdown. |
| **Validación de Tipos** | 🔴 Crítico | 🟡 **Parcial** | DB valida tipos, pero Zod en App sigue faltando. |

---

## 🔍 Análisis de Gaps Específicos

### 1. Server Actions Implícitas vs Tablas Reales
El reporte original listaba Actions que fallarían por falta de tablas. Esto ha cambiado:

*   `inviteMemberAction` → **DESBLOQUEADO** (Tabla `invitations` existe).
*   `submitPortalStepAction` → **DESBLOQUEADO** (Tabla `portal_analytics` para tracking existe).
*   `accessPortalAction` → **REFORZADO** (Índice `cases_token_idx` creado para velocidad).

### 2. Validaciones Faltantes
*   **Reporte**: "Parámetros sin límites".
*   **Estado SQL**: ⚠️ **Parcialmente Mitigado**.
    *   Se agregaron índices, pero **NO** se agregaron constraints `CHECK (length(x) < N)` en `01-tables.sql`.
    *   La DB aceptará strings infinitas hasta llegar al límite de Postgres (1GB).
    *   **Acción**: Se requiere validación Zod imperativa en el Server Action.

### 3. Códigos de Error
*   **Reporte**: "Códigos de Error no definidos".
*   **Impacto SQL**: Ahora la DB lanzará errores específicos que podemos mapear:
    *   `unique_violation` (23505) → Mapear a `EMAIL_EXISTS` o `SLUG_TAKEN`.
    *   `check_violation` (23514) → Mapear a `VALIDATION_ERROR`.
    *   `raise_exception` (P0001) → Errores custom de triggers (ej. "Quota Exceeded").

---

## ✅ Próximos Pasos (Hoja de Ruta)

Dado que la base de datos está lista, el siguiente paso lógico es **Escribir los Contratos**.

1.  **Actualizar `backend-contracts.md`**:
    *   Listar explícitamente los Server Actions ahora que sabemos qué tablas tocan.
    *   Definir los Zod Schemas basándonos en las columnas de `01-tables.sql`.
2.  **Implementar Tipos Compartidos**:
    *   Generar tipos TypeScript a partir del Schema SQL (Database Introspection).

**Conclusión**: Hemos construido los cimientos (Backend/DB). Ahora debemos construir interfaz (API Contracts) antes de construir la casa (Frontend).

# Error Handling & Monitoring - Abogado Sala

Estrategia de defensa en profundidad. La aplicación debe degradarse elegantemente, nunca mostrar una "Pantalla Blanca de la Muerte".

## 1. Capas de Protección

### Nivel Componente (Local Error Boundary)

Para widgets aislados (ej. un gráfico individual o una tabla). Si fallan, el resto del dashboard sigue vivo.

- Usar componentes `ErrorBoundary` de React.
- Fallback: UI discreta ("No pudimos cargar este gráfico") + Botón "Reintentar".

### Nivel Ruta (`error.tsx`)

Archivo especial de Next.js para capturar errores de renderizado o Server Components en una página.

- Diseño: Branding amigable, explicación clara (sin stack trace al usuario), opciones de navegación.

### Nivel Raíz (`global-error.tsx`)

Captura errores catastróficos que rompen el Layout raíz.

---

## 2. Server Actions Error Handling

Los Server Actions nunca deben lanzar excepciones (throw) al cliente para control de flujo.

- Capturar `try/catch` internamente.
- Retornar objeto `{ success: false, error: "Mensaje amigable" }`.

```typescript
// ❌ Mal
if (!user) throw new Error("No existe");

// ✅ Bien
if (!user)
  return {
    success: false,
    error: "Usuario no encontrado",
    code: "VAL_NOT_FOUND",
  };
```

> **Referencia**: Ver `backend/backend-contracts.md` -> **Diccionario de Errores** para la lista oficial (`VAL_DEPENDENCY_EXISTS`, `AUTH_SUSPENDED`, etc).

---

## 3. Notificaciones al Usuario (Feedback)

### Toasts (`sonner`)

Para errores transitorios de interacción (ej. "Error al guardar cambios").

- Color: Rojo semántico.
- Duración: 4-5 segundos.
- Icono: AlertTriangle.

### Form Errors

Para errores de validación.

- Texto estático rojo de bajo del input afectado.

---

## 4. Monitoreo & Logs (Sentry / Logs)

No basta con manejar el error en UI, debemos saber qué pasó.

- **Client-Side**: Capturar excepciones no controladas y enviarlas a Sentry (o sistema equivalente).
- **Server-Side**: Log estructurado (JSON) de errores críticos con contexto (UserId, RequestId).

### Reglas de Privacidad

- NUNCA loguear contraseñas, tokens o PII sensible en los mensajes de error.

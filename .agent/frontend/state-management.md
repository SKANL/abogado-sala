# State Management - Abogado Sala

Estrategia piramidal de estado. El objetivo es minimizar `useEffect` y el estado global complejo.

## Pirámide de Estado

### Nivel 1: URL State (La Fuente de la Verdad)

**Cualquier estado que deba ser compartible, persistir al recargar o afectar lo que muestra la página debe ir en la URL.**

- Filtros de tablas (`?status=active`).
- Paginación (`?page=2`).
- Tabs activas (`?tab=documents`).
- Modales (opcional, `?modal=create-client`).

_Herramienta_: `nuqs` (Next.js URL Query Params) o hooks nativos.

### Nivel 2: Server State

Datos que vienen del servidor. No duplicar en estado cliente.

- Usar Server Components para pasar datos iniciales.
- No guardar data del servidor en `useState` a menos que sea para edición inicial.

### Nivel 3: Local UI State

Estado efímero que no merece URL ni persistencia.

- Formularios (`useForm`).
- Toggles de dropdowns/akordeones (manejado por componentes shadcn).
- Inputs de búsqueda antes de aplicar filtro.

_Herramienta_: `useState`, `useReducer`.

### Nivel 4: Global Client State (Zustand)

**Último recurso**. Solo para estado que:

1. Es global real.
2. No cabe en la URL.
3. No es Server Data.

_Casos Válidos_:

- Estado de sesión del Sidebar (expandido/colapsado) -> persistido en localStorage.
- Carrito de compras (no aplica aquí).
- Toast Notifications (mantenido por la librería `sonner`).

---

## Reglas de Oro

1. **No sincronizar manually**: Evita `useEffect(() => { setServerData(props.data) }, [props.data])`. Usa `key` para reiniciar componentes si la data cambia.
2. **Lift State Up (Inteligentemente)**: Si dos componentes hermanos necesitan el dato, sube el estado al padre más cercano, no al contexto global.
3. **Context API**: Usar solo para inyección de dependencia o estado compuesto muy estable (Theme, AuthUser). No usar para flujos de datos rápidos (causa re-renders masivos).

## 3. Estrategia de Persistencia "Intelligent Sync" (Offline-First)

Implementación con **TanStack Query (React Query)** y **LocalStorage**.

### A. Capa de Lectura (Cache Offline)

Usar `persistQueryClient` para guardar la caché de consultas críticas en LocalStorage. Si el usuario pierde conexión, la App carga desde disco.

```typescript
// queryClient.ts
persistQueryClient({
  queryClient,
  persister: createSyncStoragePersister({ storage: window.localStorage }),
  maxAge: 1000 * 60 * 60 * 24, // 24 horas
});
```

### B. Capa de Escritura (Drafts & Mutations)

Para formularios largos (Wizard de Caso), adoptamos "Local-First, Server-Confirm".

1.  **Drafts Locales (Anti-Data-Loss)**:
    - Hook `useFormPersist('draft_case_123')` guarda cada cambio en LS.
    - Al volver a la página, detecta si hay draft local.

2.  **Sincronización Inteligente**:
    - **Auto-Save**: Cada 30s o `onBlur` de pasos, intenta enviar al backend (`cases` table).
    - **Offline**: Si falla (Network Error), marca el estado visual como "Guardado en dispositivo (Sin conexión)".
    - **Reconnection**: `window.addEventListener('online')` dispara reintento de guardado.

3.  **Conflict Handling (Server Wins)**:
    - Si el servidor tiene `updated_at` más reciente que el inicio de la sesión local, alerta al usuario: "¿Desea sobrescribir con la versión del servidor o usar su copia local?".

### C. UX de Estado de Sync

Indicadores visuales obligatorios en el header del Wizard:

- 🟢 "Guardado en la nube" (All synced).
- 🟡 "Guardando..." (Network request in flight).
- 🟠 "Guardado localmente" (Offline / Pending Sync).
- 🔴 "Error al guardar" (Validation Error).

---

## 4. Performance & Rendering Strategy (SRE Enforced)

### 4.1. Re-render Audits

- **Tooling**: Developers must use React DevTools "Highlight updates" during QA.
- **Rule**: If a parent re-renders, children typically re-render. Use `React.memo` for expensive sub-trees (charts, big tables) but **measure first**. premature memoization is bad.

### 4.2. Large List Virtualization

- **Threshold**: Any list capable of showing > 50 items MUST be virtualized.
- **Library**: `tanstack-virtual`.
- **Constraint**: No recursive rendering of 100+ DOM nodes depth.

### 4.3. Memoization & referential Integrity

- **Callbacks**: Use `useCallback` for functions passed to memoized children.
- **Objects**: Avoid `style={{ margin: 10 }}` inline props for memoized components; move to const or className.

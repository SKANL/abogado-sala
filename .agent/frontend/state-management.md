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

## 3. Estrategia de Persistencia (Form Drafts)

Para prevenir pérdida de datos en Wizards largos (User Error, Network Ghost):

### Pattern: "Draft First" (Persistent Forms)

1.  **LocalStorage Mirror**: Todo Wizard de >1 paso debe usar un hook `useFormPersist(key)`.
    - **Write**: `watch()` changes -> Debounce (500ms) -> `localStorage.setItem`.
    - **Read**: `useEffect` on mount -> `reset(JSON.parse(localStorage))`.
2.  **Conflict Resolution ("El Refresh Asesino")**:
    - **Scenario**: Usuario abre el form en 2 pestañas o vuelve después de días.
    - **Strategy**:
      - Al montar, comparar `localStorage.timestamp` vs `serverData.updated_at`.
      - Si `serverData` es más reciente, **ignorar LocalStorage**.
      - Si `localStorage` es más reciente (o Server es null), **restaurar Local**.
    - **UI**: Mostrar "Borrador restaurado" toast si se recuperó del local.
3.  **Clean on Success**: Al recibir `200 OK` del Server Action final, borrar la key del storage.
4.  **UX Feedback**: Mostrar "Guardado" (check discreto) alado del título.

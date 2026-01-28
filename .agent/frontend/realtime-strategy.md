# Realtime Strategy - Abogado Sala

Estrategia para una UI reactiva y viva, superando la implementación legacy.

## 1. Filosofía Realtime

No todo necesita realtime. Usar WebSocket consume recursos y conexiones.
**Regla**: Solo activar Realtime en vistas donde la "frescura" del dato es crítica para la operación inmediata.

### Casos de Uso Aprobados

1.  **Dashboard Feed**: Ver "En vivo" cuando un cliente sube un documento.
2.  **Detalle de Expediente**: Si el cliente llena el form mientras el abogado lo mira, ver los campos completarse.
3.  **Lista de Alertas**: Notificaciones urgentes.

### Estrategia de Persistencia (No "Transient Feeds")

- **Problema**: WebSockets se pierden si el usuario está offline.
- **Solución**: Todo evento crítico (`FILE_UPLOADED`, `CASE_SIGNED`) debe:
  1. Insertarse en tabla `notifications`.
  2. El cliente hace fetch inicial de `notifications` no leídas.
  3. Realtime solo "empuja" las nuevas.

---

## 2. Arquitectura Técnica (`hooks/useRealtime.ts`)

A diferencia del legacy `useRealtimeTable` (que era inseguro y genérico), usaremos **Hooks Tipados con Filtros de Seguridad**.

```typescript
// Ejemplo de implementación robusta
export function useRealtimeClientUpdates(clientId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`client-${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          // table y filter deben cumplir el contrato definido en Backend
          table: "clients",
          filter: `id=eq.${clientId}`,
        },
        (payload) => {
          // Estrategia: Invalidar cache de React Query en vez de mutar estado local manualmente
          // Esto asegura consistencia con el servidor.
          queryClient.invalidateQueries({ queryKey: ["client", clientId] });
          toast.info("El expediente se ha actualizado");
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);
}
```

### Mejoras vs Legacy

- **React Query Integration**: El legacy mutaba un array local `setData`. El nuevo invalida la caché, provocando un refetch limpio que pasa por los transformadores de Zod. Más seguro.
- **Granularidad**: Suscripción por `Row ID` o `Owner ID`, nunca a "toda la tabla".

---

## 3. UI Patterns para Realtime

### The "Yellow Fade" Technique

Cuando un dato cambia en tiempo real, el componente debe iluminarse suavemente (bg-yellow-100 -> bg-transparent) para indicar cambio.

### Toast de Actividad

Si el usuario está en otra pestaña, mostrar un Toast: "Juan acaba de firmar el contrato".

---

## 4. Implementación en Módulos

### Dashboard (`LiveFeed`)

- Suscribirse a `activity_logs` con filtro `owner_id = me`.
- Al recibir evento `INSERT`:
  - Agregar item al tope de la lista con animación `slide-down`.

### Portal (`Co-Browsing Lite`)

- Si el abogado y el cliente están viendo el mismo expediente, los cambios de estado (ej. "Aprobado") se reflejan instantáneamente sin recargar.

### Global Interactions (`Notifications`)

- Suscribirse a `notifications` con filtro `user_id = me`.
- Al recibir evento `INSERT`:
  1. Incrementar contador de "Unread" en navbar.
  2. Disparar **Toast Notification** (Sonner) con título y mensaje.
  3. Invalidar Query `['notifications']` si el drawer está abierto.

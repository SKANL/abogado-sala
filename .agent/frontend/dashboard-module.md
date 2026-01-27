# Dashboard Module - Abogado Sala

Visualización de KPIs y orquestación de datos.

## 1. Adaptación por Rol (Feature Toggling)

El Dashboard no es estático. Renderiza widgets según quién mira.

### Owner View ("El Jefe")

- **KPIs Financieros** (si aplica) o Métricas Macro.
- **Actividad Global**: "Juan (Abogado) creó expediente X".
- **Estado del Sistema**: "Plan Pro - 80% almacenamiento usado".

### Lawyer View ("El Operativo")

- **KPIs Personales**: "Mis Expedientes Activos", "Tareas Pendientes".
- **Accesos Rápidos**: "Nuevo Cliente", "Ver mis plantillas".

---

## 2. Widgets ("The Good Ideas from Legacy")

### A. Live Activity Feed (Mejorado)

Inspirado en `recent-clients.tsx` del legacy, pero con Realtime real.

- **Componente**: `ActivityTimeline`.
- **Behavior**: Scroll infinito virtualizado.
- **Realtime**: Nuevos eventos entran con animación `AnimatePresence`.

### B. Quick Actions (Mejorado)

Inspirado en `quick-actions.tsx`.

- Botones grandes con iconos y atajos de teclado (`N` para Nuevo cliente).
- "Magic Search": Un input estilo `Cmd+K` para buscar cualquier expediente al instante.

---

## 3. Implementación Técnica (`DashboardPage.tsx`)

```tsx
async function DashboardPage() {
  const user = await getCurrentUser();
  const role = user.role; // 'admin' | 'lawyer'

  return (
    <div className="grid gap-4">
      {/* Zona Común */}
      <WelcomeHeader user={user} />

      {/* Diferenciación */}
      {role === "admin" ? (
        <AdminStatsTiles orgId={user.orgId} />
      ) : (
        <LawyerPersonalStats userId={user.id} />
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <LiveActivityFeed scope={role} />
        <QuickActionsPanel />
      </div>
    </div>
  );
}
```

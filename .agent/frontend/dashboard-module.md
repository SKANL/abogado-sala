# Dashboard Module - Abogado Sala

Contenido principal del dashboard: métricas, actividad y acciones rápidas.

## Skills Requeridos

- `shadcn-ui` → Cards y layouts
- `react-best-practices` → Suspense boundaries
- `responsive-design` → Grids adaptativos

## Referencia Original

`sala-cliente/src/app/(dashboard)/dashboard/` y `sala-cliente/src/components/dashboard/`

---

## Páginas a Crear

### Dashboard Home

**Ubicación**: `src/app/(dashboard)/dashboard/page.tsx`

**Estructura**:

```tsx
<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
  {/* Header */}
  <div>
    <h1 className="text-2xl font-bold tracking-tight">Panel Principal</h1>
    <p className="text-muted-foreground">
      Bienvenido de vuelta. Aquí tienes un resumen de tu actividad.
    </p>
  </div>

  {/* Metrics */}
  <Suspense fallback={<MetricCardsSkeleton />}>
    <MetricCards stats={stats} />
  </Suspense>

  {/* Content Grid */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <div className="lg:col-span-2">
      <Suspense fallback={<RecentClientsSkeleton />}>
        <RecentClients clients={stats?.recentActivity || []} />
      </Suspense>
    </div>
    <QuickActions />
  </div>
</div>
```

---

## Componentes del Dashboard

### 1. Metric Cards

**Ubicación**: `src/components/dashboard/metric-cards.tsx`

**Métricas a mostrar**:
| Métrica | Icono | Descripción |
|---------|-------|-------------|
| Total Clientes | `Users` | Total de salas creadas |
| Completadas | `FileCheck` | Salas finalizadas |
| Pendientes | `Clock` | En proceso |
| Tasa Completado | `TrendingUp` | % de éxito |

**Grid Responsive**:

```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {metrics.map((metric) => (
    <Card key={metric.title}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
        <metric.icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metric.value}</div>
        <p className="text-xs text-muted-foreground">{metric.description}</p>
      </CardContent>
    </Card>
  ))}
</div>
```

---

### 2. Recent Clients

**Ubicación**: `src/components/dashboard/recent-clients.tsx`

**Estructura**:

```
Card
├── CardHeader
│   └── CardTitle "Actividad Reciente"
└── CardContent
    └── Lista de clientes recientes
        ├── Avatar
        ├── Nombre + Caso
        ├── Fecha
        └── Badge de estado
```

**Responsive**:

- Mobile: Stack vertical compacto
- Desktop: Lista con más detalles

---

### 3. Quick Actions

**Ubicación**: `src/components/dashboard/quick-actions.tsx`

**Acciones**:

```tsx
const actions = [
  {
    title: "Nuevo Cliente",
    description: "Crear sala de bienvenida",
    href: "/clientes/nuevo",
    icon: UserPlus,
  },
  {
    title: "Ver Clientes",
    description: "Gestionar clientes activos",
    href: "/clientes",
    icon: Users,
  },
];
```

---

### 4. Skeletons

Cada componente necesita su skeleton:

```tsx
function MetricCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## Patrón de Página Estándar

Todas las páginas del dashboard siguen este patrón:

```tsx
export default function SomePage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Título</h1>
        <p className="text-muted-foreground">Descripción</p>
      </div>

      {/* Content */}
      <Content />
    </div>
  );
}
```

---

## Páginas Adicionales

### Ayuda

`src/app/(dashboard)/ayuda/page.tsx`

- Accordion con FAQ
- Links a documentación
- Contacto de soporte

### Mi Cuenta

`src/app/(dashboard)/mi-cuenta/page.tsx`

- Formulario de perfil
- Cambiar contraseña
- Avatar upload

### Preferencias

`src/app/(dashboard)/preferencias/page.tsx`

- Theme selector
- Notificaciones
- Idioma

---

## Verificación

- [ ] Métricas se cargan con Suspense
- [ ] Skeletons aparecen durante carga
- [ ] Grid responsive funciona
- [ ] Acciones rápidas navegables
- [ ] Estados vacíos manejados

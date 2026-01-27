# Layout Module - Abogado Sala

Sistema de navegación con sidebar colapsable y header responsivo.

## Skills Requeridos

- `shadcn-ui` → Componente Sidebar
- `responsive-design` → Patrones adaptativos
- `nextjs-best-practices` → App Router layouts

## MCPs a Usar

```
mcp_shadcn-ui_get_component → sidebar
mcp_shadcn-ui_get_component_demo → sidebar demo
```

## Referencia Original

`sala-cliente/src/components/layout/`

---

## Componentes a Crear

### 1. SidebarProvider Setup

El sidebar de shadcn requiere un provider en el layout.

**Dashboard Layout**: `src/app/(dashboard)/layout.tsx`

```tsx
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

---

### 2. App Sidebar

**Ubicación**: `src/components/layout/app-sidebar.tsx`

**Estructura**:

```
Sidebar (collapsible="offcanvas")
├── SidebarHeader
│   └── Logo + Nombre "Abogado Sala"
├── SidebarContent
│   ├── SidebarGroup "Principal"
│   │   ├── Panel (Dashboard)
│   │   └── Clientes
│   ├── SidebarGroup "Plantillas"
│   │   ├── Contratos
│   │   └── Cuestionarios
│   └── SidebarGroup "Secundario" (mt-auto)
│       ├── Ayuda
│       └── Admin (solo si role=admin)
├── SidebarFooter
│   └── NavUser (dropdown de usuario)
└── SidebarRail
```

**Navegación**:

```typescript
const navMain = [
  { title: "Panel", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
];

const navTemplates = [
  { title: "Contratos", url: "/plantillas/contratos", icon: FileText },
  {
    title: "Cuestionarios",
    url: "/plantillas/cuestionarios",
    icon: ClipboardList,
  },
];

const navSecondary = [{ title: "Ayuda", url: "/ayuda", icon: HelpCircle }];
```

**Active State**:

```tsx
<SidebarMenuButton
  asChild
  isActive={pathname === item.url}
  tooltip={item.title}
>
  <Link href={item.url}>
    <item.icon />
    <span>{item.title}</span>
  </Link>
</SidebarMenuButton>
```

---

### 3. Nav User

**Ubicación**: `src/components/layout/nav-user.tsx`

**Carga dinámica** (reduce bundle inicial):

```tsx
const NavUser = dynamic(() => import("./nav-user").then((mod) => mod.NavUser), {
  loading: () => <SidebarMenuSkeleton showIcon />,
  ssr: false,
});
```

**Contenido**:

```
DropdownMenu
├── Trigger (Avatar + Nombre + Email)
└── Content
    ├── Nombre y email (header)
    ├── Separator
    ├── Mi Cuenta
    ├── Preferencias
    ├── Separator
    └── Cerrar sesión
```

---

### 4. Site Header

**Ubicación**: `src/components/layout/site-header.tsx`

**Estructura**:

```
header (h-[--header-height] border-b)
├── SidebarTrigger (hamburger en móvil)
├── Separator (hidden md:block)
├── Breadcrumb (hidden md:flex)
└── div.ml-auto
    ├── ThemeSwitcher
    └── (Otros iconos si necesario)
```

**Responsive**:

- Mobile: Solo hamburger trigger
- Desktop: Breadcrumbs visibles

---

### 5. Admin Sidebar

**Ubicación**: `src/components/layout/admin-sidebar.tsx`

Variante del sidebar para el panel admin con navegación específica:

```typescript
const navAdmin = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Usuarios", url: "/admin/usuarios", icon: Users },
  { title: "Despacho", url: "/admin/despacho", icon: Building },
  { title: "Configuración", url: "/admin/configuracion", icon: Settings },
  { title: "Auditoría", url: "/admin/auditoria", icon: FileSearch },
];
```

---

## Layouts Adicionales

### Admin Layout

`src/app/(admin)/layout.tsx`

- Mismo patrón que dashboard
- Usa `AdminSidebar` en lugar de `AppSidebar`
- Header puede tener indicador "Admin"

### Loading States

`src/app/(dashboard)/loading.tsx`

```tsx
export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}
```

---

## Comportamiento Responsive

| Viewport            | Sidebar          | Header            |
| ------------------- | ---------------- | ----------------- |
| Mobile (<768px)     | Offcanvas/Drawer | Hamburger visible |
| Tablet (768-1024px) | Collapsed        | Breadcrumbs       |
| Desktop (>1024px)   | Expanded         | Full header       |

**Transiciones**:

- Sidebar slide-in suave
- No bloquear scroll en móvil

---

## CSS Variables del Sidebar

```css
:root {
  --sidebar: oklch(0.98 0.005 265);
  --sidebar-foreground: oklch(0.2 0.01 265);
  --sidebar-primary: oklch(0.25 0.02 265);
  --sidebar-primary-foreground: oklch(0.99 0 0);
  --sidebar-accent: oklch(0.94 0.01 265);
  --sidebar-accent-foreground: oklch(0.25 0.02 265);
  --sidebar-border: oklch(0.9 0.005 265);
  --sidebar-ring: oklch(0.5 0.02 265);
}
```

---

## Verificación

- [ ] Sidebar se colapsa en móvil
- [ ] Navegación activa resaltada
- [ ] Dropdown de usuario funcional
- [ ] Theme switcher en header
- [ ] Loading states en layouts
- [ ] Container queries funcionando

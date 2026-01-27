# Layout Module - Abogado Sala

Estructura de navegación global **Role-Aware**.

## 1. Arquitectura de Composición

### A. Sidebar Inteligente (`AppSidebar.tsx`)

El sidebar no es estático. Sus `navItems` se computan basados en el User Role.

```tsx
const OWNER_NAV = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Plantillas", url: "/plantillas", icon: FileText },
  { title: "Ayuda", url: "/ayuda", icon: HelpCircle }, // Feature rescatada
  { title: "Configuración", url: "/configuracion", icon: Settings },
];

const LAWYER_NAV = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Plantillas", url: "/plantillas", icon: FileText },
  { title: "Ayuda", url: "/ayuda", icon: HelpCircle }, // Feature rescatada
];
```

### B. Help Center (Feature Rescatada de Legacy)

Detectamos que `sala-cliente` tenía una sección de ayuda útil.

- **Ubicación**: Accesible desde Sidebar y menú de usuario.
- **Contenido**:
  - Tutoriales de uso (Videos cortos).
  - FAQs legales.
  - Chat de soporte (si aplica).
- **Implementación**: Componente `Sheet` que se desliza desde la derecha para no perder contexto de la página actual.

---

## 2. Layouts Específicos

### Dashboard Layout (`(dashboard)/layout.tsx`)

- **Protección**: `SidebarProvider` solo carga si hay sesión válida.
- **Slots**: `header` (Breadcrumbs) y `main` (Page content).
- **Global Helper**: `<HelpSheet />` (Pre-montado pero oculto).

### Portal Layout (`(portal)/layout.tsx`)

- **Minimalista**: Sin Sidebar lateral.
- **Header Stick**: Logo del despacho + Status de Conexión (Realtime).

---

## 3. Responsive Strategy

- **Lawyer On-the-go**: El sidebar debe ser `Sheet` (Drawer) en móvil.
- **Client Mobile**: Portal full-width.

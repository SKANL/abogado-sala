# Admin Module - Abogado Sala

Panel de administración para super usuarios y admins de organización.

## Skills Requeridos

- `shadcn-ui` → Tables, Forms, Tabs
- `react-best-practices` → Data fetching
- `nextjs-best-practices` → Server Actions

## Referencia Original

`sala-cliente/src/app/(admin)/` y `sala-cliente/src/components/admin/`

---

## Páginas a Crear

```
src/app/(admin)/admin/
├── page.tsx              # Dashboard admin
├── loading.tsx           # Loading state
├── layout.tsx            # Admin layout (usa AdminSidebar)
├── usuarios/
│   ├── page.tsx         # Lista de usuarios
│   └── [id]/
│       └── page.tsx     # Detalle de usuario
├── despacho/
│   ├── page.tsx         # Configuración del despacho
│   └── (subpages)
├── configuracion/
│   └── page.tsx         # Configuración del sistema
└── auditoria/
    └── page.tsx         # Logs de auditoría
```

---

## Componentes Admin

### 1. Admin Metric Cards

**Ubicación**: `src/components/admin/admin-metric-cards.tsx`

**Métricas de Admin**:
| Métrica | Descripción |
|---------|-------------|
| Usuarios Activos | Total de usuarios en la org |
| Salas Creadas | Total de salas |
| Almacenamiento | Espacio usado |
| Plan Actual | Tipo de suscripción |

---

### 2. Users Table

**Ubicación**: `src/components/admin/users-table.tsx`

**Columnas**:

- Avatar + Nombre
- Email
- Rol (badge)
- Estado (activo/inactivo)
- Último acceso
- Acciones

**Roles**:

```typescript
type UserRole = "super_admin" | "admin" | "lawyer" | "employee";

const roleConfig = {
  super_admin: { label: "Super Admin", variant: "destructive" },
  admin: { label: "Admin", variant: "default" },
  lawyer: { label: "Abogado", variant: "secondary" },
  employee: { label: "Empleado", variant: "outline" },
};
```

---

### 3. User Detail

**Ubicación**: `src/components/admin/user-detail.tsx`

**Secciones**:

- Información personal (editable)
- Cambiar rol
- Desactivar usuario
- Historial de actividad

---

### 4. Invite User Dialog

**Ubicación**: `src/components/admin/invite-user-dialog.tsx`

**Campos**:

- Email del usuario
- Rol a asignar
- Mensaje personalizado (opcional)

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>
      <UserPlus className="mr-2 h-4 w-4" />
      Invitar Usuario
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
      <DialogDescription>
        Envía una invitación por email para unirse a tu equipo.
      </DialogDescription>
    </DialogHeader>
    <Form>
      <FormField name="email">...</FormField>
      <FormField name="role">...</FormField>
    </Form>
    <DialogFooter>
      <Button type="submit">Enviar Invitación</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 5. Organization Settings

**Ubicación**: `src/components/admin/organization-settings.tsx`

**Tabs**:

```
Tabs
├── General
│   ├── Nombre del despacho
│   ├── Logo (upload)
│   ├── Dirección
│   └── Teléfono
├── Branding
│   ├── Color primario (color picker)
│   ├── Color secundario
│   └── Preview
└── Facturación
    ├── Plan actual
    ├── Próximo cobro
    └── Métodos de pago
```

---

### 6. System Settings

**Ubicación**: `src/components/admin/system-settings.tsx`

**Configuraciones**:

- Mensaje por defecto para salas
- Documentos requeridos por defecto
- Días de expiración del link
- Notificaciones email

---

### 7. Audit Logs Table

**Ubicación**: `src/components/admin/audit-logs-table.tsx`

**Columnas**:

- Fecha/Hora
- Usuario
- Acción
- Detalles
- IP (opcional)

**Acciones logueadas**:

- Login/Logout
- Crear/Editar/Eliminar cliente
- Crear/Editar/Eliminar plantilla
- Cambios de configuración
- Invitaciones enviadas

---

## Navegación Admin

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

## Permisos

### Acceso al Admin

Solo visible si `profile.role` es `admin` o `super_admin`.

### Middleware Check

```typescript
// middleware.ts o en layout
if (!["admin", "super_admin"].includes(profile?.role)) {
  redirect("/dashboard");
}
```

---

## Verificación

- [ ] Dashboard admin carga
- [ ] Lista de usuarios funciona
- [ ] Editar usuarios funciona
- [ ] Invitar usuarios envía email
- [ ] Configuración de despacho guarda
- [ ] Configuración del sistema guarda
- [ ] Audit logs filtrable
- [ ] Solo admins pueden acceder

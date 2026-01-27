# Clients Module - Abogado Sala

Gestión de clientes con tabla de datos, expediente y wizard de creación.

## Skills Requeridos

- `shadcn-ui` → Table, Dialog, Form
- `react-best-practices` → State management
- `responsive-design` → Tabla a cards en móvil

## Referencia Original

`sala-cliente/src/app/(dashboard)/clientes/` y `sala-cliente/src/components/dashboard/clients-table.tsx`

---

## Páginas a Crear

```
src/app/(dashboard)/clientes/
├── page.tsx              # Lista de clientes
├── loading.tsx           # Skeleton de tabla
├── nuevo/
│   └── page.tsx         # Crear nueva sala
└── [id]/
    └── page.tsx         # Expediente del cliente
```

---

## Componentes Principales

### 1. Clients Table

**Ubicación**: `src/components/dashboard/clients-table.tsx`

**Columnas**:
| Columna | Mobile | Desktop |
|---------|--------|---------|
| Nombre | ✓ | ✓ |
| Caso | ✓ | ✓ |
| Estado | ✓ (badge) | ✓ |
| Fecha | ✗ | ✓ |
| Acciones | Dropdown | Inline + Dropdown |

**Estados de Cliente**:

```typescript
type ClientStatus = "completed" | "pending" | "expired";

const statusConfig = {
  completed: { label: "Completado", variant: "default", icon: CheckCircle },
  pending: { label: "Pendiente", variant: "secondary", icon: Clock },
  expired: { label: "Expirado", variant: "destructive", icon: AlertCircle },
};
```

**Acciones**:

- Ver expediente
- Copiar link de sala
- Enviar por WhatsApp
- Eliminar (con confirmación)

**Responsive Strategy**:

```tsx
// Mobile: Cards
<div className="md:hidden space-y-4">
  {clients.map((client) => (
    <ClientCard key={client.id} client={client} />
  ))}
</div>

// Desktop: Table
<div className="hidden md:block">
  <Table>...</Table>
</div>
```

---

### 2. Client Card (Mobile)

**Para vista móvil de la lista**:

```tsx
<Card>
  <CardContent className="p-4">
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="font-medium">{client.client_name}</p>
        <p className="text-sm text-muted-foreground">{client.case_name}</p>
      </div>
      <Badge variant={statusConfig[client.status].variant}>
        {statusConfig[client.status].label}
      </Badge>
    </div>
    <div className="mt-4 flex gap-2">
      <Button size="sm" variant="outline" asChild>
        <Link href={`/clientes/${client.id}`}>Ver</Link>
      </Button>
      <DropdownMenu>...</DropdownMenu>
    </div>
  </CardContent>
</Card>
```

---

### 3. Client Expediente

**Ubicación**: `src/components/dashboard/client-expediente.tsx`

**Estructura con Tabs**:

```
Tabs
├── General
│   ├── Info del cliente
│   ├── Info del caso
│   └── Link de sala (con copiar)
├── Documentos
│   ├── Contrato firmado
│   └── Documentos subidos
├── Cuestionario
│   └── Respuestas del cliente
└── Historial
    └── Timeline de actividad
```

**Header del Expediente**:

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <h1 className="text-2xl font-bold">{client.client_name}</h1>
    <p className="text-muted-foreground">{client.case_name}</p>
  </div>
  <div className="flex gap-2">
    <Badge>{status}</Badge>
    <Button variant="outline">Copiar Link</Button>
    <Button>Descargar ZIP</Button>
  </div>
</div>
```

---

### 4. Create Sala Form (Wizard)

**Ubicación**: `src/components/forms/create-sala-form.tsx`

**Pasos del Wizard**:

1. **Datos del Cliente**
   - Nombre del cliente
   - Email del cliente
   - Nombre del caso
2. **Contrato**
   - Selector de plantilla
   - Preview del contrato
3. **Documentos Requeridos**
   - Checkboxes de documentos comunes
   - Agregar documentos personalizados
4. **Cuestionario**
   - Selector de plantilla
   - Preview de preguntas
5. **Mensaje Personalizado**
   - Textarea para mensaje de bienvenida
6. **Confirmación**
   - Resumen de la configuración
   - Botón crear

**Progress Indicator**:

```tsx
<div className="flex justify-between mb-8">
  {steps.map((step, index) => (
    <div key={step.id} className="flex items-center">
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
          index <= currentStep
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {index + 1}
      </div>
      {index < steps.length - 1 && (
        <div
          className={cn(
            "h-0.5 w-12 mx-2",
            index < currentStep ? "bg-primary" : "bg-muted",
          )}
        />
      )}
    </div>
  ))}
</div>
```

---

### 5. Delete Confirmation Dialog

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Eliminar</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta acción no se puede deshacer. Se eliminará permanentemente la sala
        de {clientName}.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Funcionalidades Clave

### Copiar Link

```tsx
async function handleCopyLink(client: Client) {
  const url = `${window.location.origin}/sala/${client.magic_link_token}`;
  await navigator.clipboard.writeText(url);
  toast.success("Link copiado al portapapeles");
}
```

### WhatsApp Share

```tsx
function handleWhatsAppShare(client: Client) {
  const message = encodeURIComponent(
    `Hola ${client.client_name}, accede a tu sala: ${url}`,
  );
  window.open(`https://wa.me/?text=${message}`, "_blank");
}
```

---

## Verificación

- [ ] Tabla muestra datos correctamente
- [ ] Cards en móvil funcionan
- [ ] Expediente carga con tabs
- [ ] Wizard completa creación
- [ ] Copiar link funciona
- [ ] Eliminar con confirmación
- [ ] Estados de carga (skeletons)

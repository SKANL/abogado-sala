# UI Design Rules & Patterns - Abogado Sala

Estándares de diseño para asegurar una UI **Premium, Distintiva y Accesible**.

> **Brutal Truth**: La mayoría de las apps administrativas se ven aburridas y genéricas. Abogado Sala debe romper ese molde sin sacrificar usabilidad.

## 1. Filosofía Visual (Frontend Design Skill)

**Dirección Estética**: "Profesional Refinado con Toques Modernos".

- **typography**: No usar fuentes genéricas como Arial o Roboto. Usar **Geist Sans** (o una alternativa con carácter como `Inter Tight` o `Satoshi`).
- **Whitespace**: `p-6`, `p-8` o `gap-6` es el estándar. Si se ve apretado, está mal.
- **Elevation**: Usar bordes sutiles (`border-border`) y sombras difusas (`shadow-sm`, `shadow-md`) en lugar de sombras negras duras.
- **Glassmorphism**: Usar `bg-background/80 backdrop-blur-md` en headers y sticky overlays para dar profundidad.

---

## 2. Reglas Inquebrantables (UI/UX Pro Max)

### A. Accesibilidad (CRITICAL)

- **Contraste**: Texto normal mínimo **4.5:1**.
- **Focus Rings**: Nunca remover `outline-none` sin reemplazarlo con un `ring-2` visible en `:focus-visible`.
- **Labels**: Todo input debe tener un `<Label>` asociado o un `aria-label`.

### B. Interacción & Touch (CRITICAL)

- **Touch Targets**: Mínimo **44x44px** para cualquier elemento clickable en móvil.
  - ❌ `h-8 w-8` (icon button sin padding).
  - ✅ `h-10 w-10` o `p-2`.
- **Cursores**: Agregar `cursor-pointer` explícitamente a tarjetas interactivas (`hover:bg-muted/50`).
- **Loading UI**: Botones deshabilitados (`disabled={isLoading}`) con spinner visible durante acciones asíncronas.

### C. Anti-Patrones Visuales (DO NOT USE)

- ❌ **Emojis como Iconos**: Usar **SVG Lucide Icons** siempre. 🎨 -> `<Palette className="h-4 w-4" />`.
- ❌ **Scroll Horizontal Oculto**: En móvil, las tablas deben tener scroll explícito o transformarse en cards.
- ❌ **Layout Shift**: Reservar espacio para imágenes y gráficos. Usar Skeleton loaders del mismo tamaño exacto.

---

## 3. Tipografía Semántica

| Rol                 | Clase Tailwind (Desktop)                     | Clase Tailwind (Mobile)  |
| ------------------- | -------------------------------------------- | ------------------------ |
| **Page Title (H1)** | `text-3xl font-bold tracking-tight`          | `text-2xl`               |
| **Section (H2)**    | `text-xl font-semibold`                      | `text-lg`                |
| **Card Card (H3)**  | `text-base font-medium`                      | `text-base`              |
| **Body**            | `text-sm text-foreground/90 leading-relaxed` | `text-sm leading-normal` |
| **Micro/Muted**     | `text-xs text-muted-foreground`              | `text-xs`                |

---

## 4. Patrones de Composición (shadcn)

### Page Header (Action-Oriented)

```tsx
<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6">
  <div className="space-y-1">
    <h2 className="text-3xl font-bold tracking-tight text-foreground">
      Clientes
    </h2>
    <p className="text-muted-foreground">Gestiona tus expedientes activos.</p>
  </div>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm">
      <Download className="mr-2 h-4 w-4" /> Exportar
    </Button>
    <Button size="sm">
      <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
    </Button>
  </div>
</div>
```

### Data Card (Information Density)

```tsx
<Card className="overflow-hidden transition-all hover:shadow-md">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30">
    <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent className="pt-4">
    <div className="text-2xl font-bold">$45,231.89</div>
    <p className="text-xs text-muted-foreground mt-1 flex items-center">
      <TrendingUp className="text-green-500 h-3 w-3 mr-1" />
      +20.1% vs mes anterior
    </p>
  </CardContent>
</Card>
```

---

## 5. Mobile Adaptation Strategy

- **Navigation**: Sidebar colapsable (`Sheet` en móvil, `Sidebar` fijo en desktop).
- **Drawers**: Usar `Vaul` (Drawer de shadcn) para formularios rápidos en móvil en lugar de Modales centrados.
- **Inputs**: `text-base` en inputs móviles para evitar zoom automático de iOS, escalado a `text-sm` en desktop.

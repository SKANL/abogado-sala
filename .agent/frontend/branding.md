# Branding - Abogado Sala

Guía de identidad visual para el proyecto Abogado Sala.

## Nombre del Producto

**Abogado Sala** (anteriormente "Sala Cliente")

- Siglas: **AS**
- Tagline: "Gestión profesional para despachos modernos"

## Paleta de Colores

### Concepto

Paleta profesional inspirada en despachos jurídicos de alto nivel. Azul marino transmite confianza, autoridad y profesionalismo.

### Light Mode

```css
--background: oklch(0.99 0 0); /* Blanco puro */
--foreground: oklch(0.15 0 0); /* Carbón profundo */
--primary: oklch(0.25 0.02 265); /* Azul marino - autoritativo */
--primary-foreground: oklch(0.99 0 0); /* Blanco */
--secondary: oklch(0.95 0.005 265); /* Azul-gris claro */
--muted: oklch(0.96 0.005 265); /* Fondo sutil */
--accent: oklch(0.94 0.01 265); /* Acento suave */
--destructive: oklch(0.55 0.22 25); /* Rojo profesional */
--border: oklch(0.9 0.005 265); /* Bordes sutiles */
```

### Dark Mode

```css
--background: oklch(0.12 0.005 265); /* Azul-negro profundo */
--foreground: oklch(0.97 0.005 265); /* Blanco suave */
--primary: oklch(0.75 0.08 265); /* Azul brillante profesional */
--primary-foreground: oklch(0.12 0.005 265);
--secondary: oklch(0.22 0.01 265);
--muted: oklch(0.22 0.01 265);
--accent: oklch(0.25 0.015 265);
--destructive: oklch(0.6 0.2 25);
--border: oklch(0.25 0.01 265);
```

## Tipografía

### Fuentes

- **Sans-serif principal**: Geist Sans
- **Monospace**: Geist Mono

### Escala Tipográfica

```
text-xs:   0.75rem (12px)
text-sm:   0.875rem (14px)
text-base: 1rem (16px)
text-lg:   1.125rem (18px)
text-xl:   1.25rem (20px)
text-2xl:  1.5rem (24px)
text-3xl:  1.875rem (30px)
text-4xl:  2.25rem (36px)
```

### Pesos

- Regular: 400 (cuerpo de texto)
- Medium: 500 (labels, subtítulos)
- Semibold: 600 (encabezados, botones)
- Bold: 700 (títulos principales)

## Logo

### Formato Provisional

```tsx
<div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold">
  AS
</div>
```

### Variantes de Tamaño

- Pequeño: 24x24px (móvil, collapsed sidebar)
- Normal: 32x32px (sidebar, header)
- Grande: 48x48px (landing page)

## Iconografía

### Librería

Usar **Lucide React** exclusivamente.

### Iconos Principales

| Contexto      | Icono                        |
| ------------- | ---------------------------- |
| Dashboard     | `LayoutDashboard`            |
| Clientes      | `Users`                      |
| Contratos     | `FileText`                   |
| Cuestionarios | `ClipboardList`              |
| Ayuda         | `HelpCircle`                 |
| Configuración | `Settings`                   |
| Usuario       | `User`                       |
| Cerrar sesión | `LogOut`                     |
| Agregar       | `Plus`                       |
| Editar        | `Pencil`                     |
| Eliminar      | `Trash2`                     |
| Ver           | `Eye`                        |
| Copiar        | `Copy`                       |
| Éxito         | `CheckCircle`                |
| Error         | `AlertCircle`                |
| Pendiente     | `Clock`                      |
| Carga         | `Loader2` (con animate-spin) |

## Espaciado

### Sistema

Usar múltiplos de 4px (0.25rem):

```
space-1:  0.25rem (4px)
space-2:  0.5rem (8px)
space-3:  0.75rem (12px)
space-4:  1rem (16px)
space-6:  1.5rem (24px)
space-8:  2rem (32px)
space-12: 3rem (48px)
space-16: 4rem (64px)
```

### Gaps Comunes

- Entre elementos de lista: `gap-2` o `gap-4`
- Entre secciones: `gap-6` o `gap-8`
- Padding de cards: `p-4` o `p-6`
- Padding de página: `p-4 md:p-6`

## Border Radius

### Variables

```css
--radius: 0.5rem;
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) + 4px);
```

### Uso

- Inputs, buttons: `rounded-md`
- Cards: `rounded-lg`
- Avatares: `rounded-full`
- Logo: `rounded-lg`

## Sombras

### Light Mode

- Cards elevadas: `shadow-md`
- Modals: `shadow-xl`
- Dropdowns: `shadow-lg`

### Dark Mode

Reducir opacidad de sombras o usar bordes sutiles en su lugar.

## Animaciones

### Transiciones

```css
transition-all: 150ms ease
transition-colors: 150ms ease
```

### Micro-interacciones

- Hover en botones: cambio de fondo suave
- Focus: ring visible `ring-offset-2`
- Loading: `animate-spin` en Loader2
- Skeleton: `animate-pulse`

## Estados

### Badges de Estado

| Estado      | Color | Variante      |
| ----------- | ----- | ------------- |
| Completado  | Verde | `default`     |
| Pendiente   | Gris  | `secondary`   |
| Expirado    | Rojo  | `destructive` |
| En progreso | Azul  | `outline`     |

## No Hacer

- ❌ Usar colores fuera de la paleta definida
- ❌ Mezclar estilos de iconos (solo Lucide)
- ❌ Añadir animaciones excesivas o lentas
- ❌ Usar fuentes que no sean Geist
- ❌ Ignorar el contraste mínimo WCAG AA
- ❌ Border radius inconsistentes

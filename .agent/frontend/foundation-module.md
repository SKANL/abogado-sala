# Foundation Module - Abogado Sala

Setup inicial del proyecto con shadcn/ui. **ESTE ARCHIVO ES LA ÚNICA FUENTE DE VERDAD PARA `globals.css`**.

## 1. Dependencias Críticas

```bash
npm install next-themes sonner lucide-react clsx tailwind-merge
npm install -D tailwindcss-animate
```

## 2. Configuración de Colores (Single Source of Truth)

Toda la UI debe consumir estas variables. **Prohibido usar colores arbitrarios** (ej. `bg-[#123456]`).

### `src/app/globals.css`

Copia exacta para producción. Usamos **OKLCH** para consistencia perceptual.

```css
@import "tailwindcss";

@plugin "tailwindcss-animate";

@custom-variant dark (&:is(.dark *));

:root {
  /* Brand Colors (Professional Blue) */
  --primary: 250 0.1 0.25; /* Deep Trust Blue */
  --primary-foreground: 0 0 0.98; /* White */

  --secondary: 250 0.05 0.96; /* Ice Blue (Muted) */
  --secondary-foreground: 250 0.1 0.25;

  --accent: 250 0.15 0.6; /* Electric Action Blue */
  --accent-foreground: 0 0 0.98;

  /* Neutrals (Slate-tinted) */
  --background: 0 0 1;
  --foreground: 250 0.05 0.15;

  --card: 0 0 1;
  --card-foreground: 250 0.05 0.15;

  --popover: 0 0 1;
  --popover-foreground: 250 0.05 0.15;

  --muted: 250 0.02 0.96;
  --muted-foreground: 250 0.02 0.45;

  /* Borders & feedback */
  --border: 250 0.02 0.9;
  --input: 250 0.02 0.9;
  --ring: 250 0.1 0.25;

  --destructive: 25 0.2 0.4; /* Error Red */
  --destructive-foreground: 0 0 0.98;

  --radius: 0.5rem;
}

.dark {
  /* Dark Mode Overrides (Deep Navy) */
  --background: 250 0.05 0.12;
  --foreground: 0 0 0.98;

  --card: 250 0.05 0.14;
  --card-foreground: 0 0 0.98;

  --popover: 250 0.05 0.14;
  --popover-foreground: 0 0 0.98;

  --muted: 250 0.05 0.2;
  --muted-foreground: 250 0.02 0.65;

  --border: 250 0.05 0.2;
  --input: 250 0.05 0.2;
  --ring: 250 0.1 0.6;
}

@theme inline {
  --color-background: oklch(var(--background));
  --color-foreground: oklch(var(--foreground));
  --color-card: oklch(var(--card));
  --color-card-foreground: oklch(var(--card-foreground));
  --color-popover: oklch(var(--popover));
  --color-popover-foreground: oklch(var(--popover-foreground));
  --color-primary: oklch(var(--primary));
  --color-primary-foreground: oklch(var(--primary-foreground));
  --color-secondary: oklch(var(--secondary));
  --color-secondary-foreground: oklch(var(--secondary-foreground));
  --color-muted: oklch(var(--muted));
  --color-muted-foreground: oklch(var(--muted-foreground));
  --color-accent: oklch(var(--accent));
  --color-accent-foreground: oklch(var(--accent-foreground));
  --color-destructive: oklch(var(--destructive));
  --color-destructive-foreground: oklch(var(--destructive-foreground));
  --color-border: oklch(var(--border));
  --color-input: oklch(var(--input));
  --color-ring: oklch(var(--ring));
  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: calc(var(--radius));
  --radius-lg: calc(var(--radius) + 2px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## 3. Utilidades (`src/lib/utils.ts`)

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 4. Verificación de Integridad

- [ ] Tailwind Intellisense funciona y autocompleta `bg-primary`.
- [ ] No existen colores `hex` en ningún componente.
- [ ] Dark mode invierte correctamente los colores sin parpadeos (`suppressHydrationWarning` en `html`).

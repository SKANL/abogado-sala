# Foundation Module - Abogado Sala

Setup inicial del proyecto con shadcn/ui, dependencias y design tokens.

## Skills Requeridos

- `shadcn-ui` → Instalación y configuración
- `shadcn-ui-expert` → Patrones avanzados
- `nextjs-shadcn-builder` → Integración Next.js

## MCPs a Usar

```
mcp_shadcn_get_add_command_for_items → Comandos de instalación
mcp_shadcn-ui_list_components → Lista de componentes disponibles
```

---

## Checklist de Implementación

### 1. Dependencias

```bash
npm install @hookform/resolvers @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-progress @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-tooltip class-variance-authority clsx lucide-react next-themes react-hook-form sonner tailwind-merge vaul zod

npm install -D tw-animate-css
```

### 2. Inicializar shadcn/ui

```bash
npx shadcn@latest init
# Seleccionar: new-york style, neutral base color, CSS variables
```

### 3. Crear components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### 4. Crear src/lib/utils.ts

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 5. Actualizar globals.css

Ver `branding.md` para la paleta de colores completa.

Estructura requerida:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* Mapeo de variables CSS a Tailwind */
}

:root {
  /* Variables Light Mode */
}

.dark {
  /* Variables Dark Mode */
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

### 6. Instalar Componentes Base

```bash
npx shadcn@latest add button card input label form dialog alert-dialog dropdown-menu avatar badge skeleton tabs tooltip separator scroll-area select switch checkbox textarea accordion progress table sheet drawer sidebar breadcrumb
```

### 7. Crear Theme Provider

```
src/components/theme/
├── index.ts
├── theme-provider.tsx    # next-themes wrapper
├── theme-switcher.tsx    # Toggle light/dark
└── dynamic-theme.tsx     # Runtime CSS vars
```

### 8. Actualizar Root Layout

```tsx
// src/app/layout.tsx
import { ThemeProvider } from "@/components/theme";
import { Toaster } from "sonner";

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${fonts} antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## Estructura de Archivos Resultante

```
src/
├── app/
│   ├── globals.css        # Design tokens
│   ├── layout.tsx         # Root layout con providers
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # Componentes shadcn
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ... (31 componentes)
│   └── theme/
│       ├── index.ts
│       ├── theme-provider.tsx
│       └── theme-switcher.tsx
├── lib/
│   └── utils.ts           # cn() utility
└── hooks/
    └── (hooks compartidos)
```

---

## Verificación

- [ ] `npm run build` sin errores
- [ ] Theme toggle funciona (light/dark)
- [ ] Variables CSS aplicadas correctamente
- [ ] Componentes shadcn importables

# Frontend Migration - Abogado Sala

Este directorio contiene las instrucciones especializadas para la migración del frontend desde `sala-cliente` a `abogado-sala`.

## Estructura de Agents

| Archivo               | Propósito                                          |
| --------------------- | -------------------------------------------------- |
| `AGENTS.md`           | Este archivo - Instrucciones globales de frontend  |
| `branding.md`         | Identidad visual, colores, tipografía              |
| `foundation.md`       | Setup inicial: shadcn, dependencias, design tokens |
| `auth-module.md`      | Módulo de autenticación                            |
| `layout-module.md`    | Dashboard layout: sidebar, header                  |
| `dashboard-module.md` | Contenido del dashboard                            |
| `clients-module.md`   | Gestión de clientes                                |
| `templates-module.md` | Plantillas de contratos y cuestionarios            |
| `portal-module.md`    | Portal cliente (mobile-first)                      |
| `admin-module.md`     | Panel de administración                            |

## Skills Disponibles

Usar las siguientes skills del directorio `.agent/skills/`:

- **shadcn-ui**: Componentes y patrones de shadcn/ui
- **shadcn-ui-expert**: Desarrollo avanzado con shadcn
- **nextjs-shadcn-builder**: Construcción de apps Next.js con shadcn
- **responsive-design**: Diseño responsive con container queries
- **frontend-design**: Principios de diseño frontend
- **frontend-ui-ux**: UX/UI profesional
- **ui-ux-pro-max**: Estilos y paletas avanzadas
- **react-best-practices**: Patrones de React
- **nextjs-best-practices**: Patrones de Next.js App Router

## MCPs Disponibles

- **shadcn**: CLI commands y ejemplos de shadcn
- **shadcn-ui**: Componentes y bloques de shadcn/ui v4

## Reglas Globales

### Performance First

- Usar dynamic imports para componentes pesados
- Implementar Suspense boundaries con skeletons
- Lazy load de imágenes con next/image
- Minimizar client components ("use client")

### Mobile-First + Desktop-Adapted

- Base styles = mobile
- Progressive enhancement con breakpoints
- Touch targets mínimo 44x44px en móvil
- Container queries para componentes adaptativos

### Accesibilidad

- Usar componentes Radix UI (via shadcn)
- Labels semánticas en formularios
- Focus states visibles
- Contraste WCAG AA mínimo

### Código Limpio

- TypeScript estricto
- Componentes pequeños y enfocados
- Naming conventions consistentes
- Documentar props con JSDoc cuando necesario

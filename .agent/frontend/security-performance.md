# Security & Performance - Abogado Sala

Guías críticas para un frontend blindado y veloz.

## 1. Seguridad en Frontend (Security)

### Cero Confianza en Input

- **Zod Everything**: Cada formulario y cada parámetro de URL debe pasar por un esquema Zod.
- **No HTML Injection**: Nunca usar `dangerouslySetInnerHTML` a menos que sea contenido sanitizado de un CMS confiable.

### Manejo de Sesión

- No guardar JWT en `localStorage`. Usar cookies `httpOnly` (gestionadas por Supabase Auth auth-helpers).
- Al cerrar sesión, limpiar explícitamente cualquier caché de `TanStack Query` o estados de `Zustand` que puedan tener datos sensibles.

### Protección de Rutas

- **Middleware**: La primera línea de defensa.
- **Layout Checks**: Server Components que verifiquen rol antes de renderizar hijos.
- **Runc-time Checks**: En Server Actions, volver a verificar `getUser()` antes de mutar datos.

---

## 2. Performance (Core Web Vitals)

### LCP (Largest Contentful Paint)

- **Imagenes**: Usar `next/image` con `priority` para la imagen principal (Hero o Logo).
- **Fuentes**: Usar `next/font` para cargar Geist Sans sin Layout Shift.

### CLS (Cumulative Layout Shift)

- **Skeletons**: NUNCA renderizar `null` mientras carga y luego el componente. Renderizar un `Skeleton` de las mismas dimensiones.
- Dimensiones explícitas para imágenes y contenedores de gráficos.

### INP (Interaction to Next Paint)

- **Transiciones**: Envolver Server Actions o cambios de ruta pesados en `startTransition` o `useTransition` para mantener la UI responsiva.
- **Feedback Inmediato**: Al pulsar un botón, deshabilitarlo y mostrar spinner inmediatamente (Optimistic UI state).

---

## 3. Bundle Size Optimization

- **Lazy Loading**: `lazy(() => import('./HeavyChart'))` para componentes pesados que no están en el viewport inicial (below the fold).
- **Importaciones Nombradas**: Importar iconos de Lucide individualmente para mejorar Tree Shaking.
  - ✅ `import { User } from 'lucide-react'`
  - ❌ `import * as Icons from 'lucide-react'`

---

## 4. Checklist de Auditoría

- [ ] Ejecutar `npm run lint` y corregir todos los warnings.
- [ ] Verificar que no hay secretos (API Keys privadas) en el código cliente.
- [ ] Lighthouse Score > 95 en (Performance, Accessibility, Best Practices, SEO).

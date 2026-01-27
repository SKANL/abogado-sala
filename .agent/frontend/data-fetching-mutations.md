# Data Fetching & Mutations - Abogado Sala

Estrategia unificada para el manejo de datos asíncronos. Priorizamos **Server Components** y **Server Actions**.

## 1. Lectura de Datos (Fetching)

### Patrón A: Server Components (Default)

Usar siempre que sea posible. Directo a la DB o API desde el servidor.

```tsx
// ✅ Correcto
async function DashboardData() {
  const data = await getStats(); // Función type-safe de base de datos
  return <StatsView data={data} />;
}
```

### Patrón B: Client Components (TanStack Query)

Usar SOLO cuando se requiere interactividad en tiempo real, polling o paginación infinita compleja que no se resuelve bien con Server Actions + URL State.

- Usar `useSuspenseQuery` para compatibilidad con Suspense.

---

## 2. Escritura de Datos (Mutations)

### Server Actions (Exclusivo)

Toda mutación debe ser un **Server Action**. No usar Route Handlers (`/api/...`) para mutaciones provocadas por la UI.

#### Estructura de un Action

Todos los actions deben retornar un objeto estándar `Result<T>`:

```typescript
type Result<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      validationErrors?: Record<string, string[]>;
    };
```

#### Validación (Zod)

**NUNCA** confiar en el input del cliente.

1. Validar `FormData` con Zod en el Action.
2. Si falla, devolver errores estructurados.
3. Si pasa, ejecutar lógica de negocio.

```typescript
// features/auth/api/loginAction.ts
"use server";
export async function loginAction(formData: FormData) {
  const parse = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parse.success) {
    return {
      success: false,
      validationErrors: parse.error.flatten().fieldErrors,
    };
  }
  // ... lógica ...
}
```

---

## 3. Caching & Revalidation

### Fetch Cache

Next.js cachea por defecto.

- Usar `unstable_cache` para queries pesadas de base de datos.
- Usar etiquetas (`tags`) para invalidación granular.

### Revalidación Inteligente

Después de una mutación exitosa dentro de un Server Action:

- `revalidatePath('/dashboard')`: Si el cambio afecta una ruta específica.
- `revalidateTag('clients')`: Si afecta a una entidad global.

---

## 4. Optimistic UI

Para UX instantánea, usar `useOptimistic` en mutaciones simples (ej. toggle like, borrar item de lista).

```tsx
const [optimisticClients, deleteOptimistic] = useOptimistic(
  clients,
  (state, id) => state.filter((c) => c.id !== id),
);
```

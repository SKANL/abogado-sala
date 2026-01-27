# Architecture & SOLID Principles - Abogado Sala

Este documento define las reglas innegociables de arquitectura para el frontend. Basado en **Clean Architecture** adaptada a Next.js App Router.

## 1. Feature-Based Architecture (Screaming Architecture)

No agrupamos por "tipo" (components, hooks, utils), agrupamos por **FUNCIONALIDAD**.

```
src/
├── app/                  # Routing Layer (Solo Pages, Layouts y Route Handlers)
├── features/             # La carne del sistema
│   ├── auth/             # Módulo Auth
│   ├── dashboard/        # Módulo Dashboard
│   │   ├── components/   # UI específica de Dashboard
│   │   ├── hooks/        # Lógica específica
│   │   ├── api/          # Server Actions y Fetchers
│   │   └── types/        # Tipos de dominio
│   └── clients/          # Módulo Clientes
├── components/           # Shared UI (Design System / Shadcn)
├── lib/                  # Shared Logic (Utils, Constants)
└── hooks/                # Shared Hooks (useMediaQuery, useDebounce)
```

### Regla de Dependencia

- `features/` pueden importar `components/`, `lib/` y `hooks/`.
- `features/A` **NO** debe importar directamente código de `features/B`.
- Si dos features comparten lógica, esa lógica debe promoverse a `lib/` o un nuevo feature `shared`.

---

## 2. SOLID en React

### S - Single Responsibility Principle (SRP)

Un componente debe tener **una sola razón para cambiar**.

- ❌ `UserProfile` que hace fetch, valida formularios y renderiza UI.
- ✅ `UserProfileContainer` (Fetch) -> `UserProfileForm` (Lógica Form) -> `ui/Card` (Presentación).

### O - Open/Closed Principle (OCP)

Los componentes deben estar **abiertos a extensión pero cerrados a modificación**.

- Usar **Composición** (`children`, `slots`) en lugar de añadir mil props booleanas (`isRed`, `hasIcon`, `withBorder`).
- _Ejemplo_: `Card` de shadcn acepta cualquier contenido en `CardContent`, no necesita props para cada posible variante de contenido.

### L - Liskov Substitution Principle (LSP)

Si un componente acepta una prop de tipo `ButtonProps`, debe comportarse como un botón. No rompas la accesibilidad ni los eventos estándar.

### I - Interface Segregation Principle (ISP)

No pases el objeto `usuario` entero (con 50 campos) a un componente `UserAvatar` que solo necesita `avatarUrl` y `name`.

- Define interfaces específicas para las props: `interface UserAvatarProps { image: string; name: string }`.

### D - Dependency Inversion Principle (DIP)

Los componentes de alto nivel no deben depender de implementaciones de bajo nivel. Ambos deben depender de abstracciones (Hooks/Context).

- En lugar de importar `fetch('/api/users')` directo en un botón, inyecta la acción o usa un Hook `useUsers()`.

---

## 3. Abstracciones Clave

### UI Components (Presentational)

- **Responsabilidad**: Renderizar HTML/CSS.
- **Dependencias**: Cero lógica de negocio. Solo props.
- **Ubicación**: `src/components/ui` o `src/features/*/components`.

### Layout Components

- **Responsabilidad**: Estructura y disposición (Grid, Sidebar).
- **Dependencias**: Otros componentes.

### Container/Page Components

- **Responsabilidad**: Data Fetching (Suspense), Gestión de Estado, Enrutamiento.
- **Dependencias**: Services, Actions, Stores.

## 4. Anti-Patrones a Evitar (Code Smells)

- **Prop Drilling**: Pasar props más de 2 niveles-> Usar Context o Composition.
- **God Components**: Archivos de >200 líneas -> Dividir.
- **Logic in JSX**: Operadores ternarios anidados -> Extraer a variables o subcomponentes.
- **Hardcoded Styles**: `style={{ margin: 10 }}` -> Usar clases de Tailwind.

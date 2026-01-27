# Auth Module - Abogado Sala

Módulo de autenticación con diseño profesional split-screen.

## Skills Requeridos

- `shadcn-ui` → Formularios y validación
- `react-best-practices` → Hooks y efectos
- `responsive-design` → Adaptación móvil/desktop

## Referencia Original

`sala-cliente/src/app/(auth)/` y `sala-cliente/src/components/forms/`

---

## Componentes a Crear

### 1. Auth Layout

**Ubicación**: `src/app/(auth)/layout.tsx`

```tsx
// Contenedor centrado con fondo muted
<div className="flex min-h-svh w-full items-center justify-center bg-muted p-4 md:p-10">
  <div className="w-full max-w-5xl">{children}</div>
</div>
```

**Responsive**:

- Mobile: padding 1rem
- Desktop: padding 2.5rem, max-width 5xl

---

### 2. Login Form

**Ubicación**: `src/components/forms/login-form.tsx`

**Estructura**:

```
Card (border-0, shadow-xl)
├── CardContent (grid md:grid-cols-2)
│   ├── Form Section (p-6 md:p-12)
│   │   ├── Título "Bienvenido"
│   │   ├── Error display (si existe)
│   │   ├── Form con react-hook-form + zod
│   │   │   ├── Email input
│   │   │   ├── Password input (con link forgot)
│   │   │   └── Submit button
│   │   └── Link a registro
│   └── Image Section (hidden md:block)
│       ├── next/image fill
│       ├── Overlay con primary/10
│       └── Quote box (glassmorphism)
```

**Responsive**:

- Mobile: Solo formulario, imagen oculta
- Desktop: Split 50/50, imagen con quote

**Validación**:

```typescript
const formSchema = z.object({
  email: z.string().email("Ingresa un correo válido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
```

---

### 3. Register Form

**Ubicación**: `src/components/forms/register-form.tsx`

**Campos**:

- Nombre completo
- Email
- Contraseña
- Confirmar contraseña
- Nombre del despacho (opcional)
- Checkbox términos y condiciones

**Multi-step** (opcional):

1. Datos personales
2. Datos del despacho
3. Confirmación

---

### 4. Forgot Password Form

**Ubicación**: `src/components/forms/forgot-password-form.tsx`

**Flujo**:

1. Input email
2. Submit → envía email
3. Mensaje de confirmación

**Diseño**: Centrado, sin split-screen

---

### 5. Trial Expired Page

**Ubicación**: `src/app/(auth)/trial-expired/page.tsx`

Página estática con:

- Icono de alerta
- Mensaje explicativo
- CTA para upgrade o contacto

---

## Páginas a Crear

```
src/app/(auth)/
├── layout.tsx           # Auth layout
├── loading.tsx          # Loading skeleton
├── login/
│   └── page.tsx        # Renderiza LoginForm
├── register/
│   └── page.tsx        # Renderiza RegisterForm
├── forgot-password/
│   └── page.tsx        # Renderiza ForgotPasswordForm
├── onboarding/
│   └── page.tsx        # Flujo post-registro
├── register-invite/
│   └── page.tsx        # Registro por invitación
└── trial-expired/
    └── page.tsx        # Trial expirado
```

---

## Patrones de UI

### Input Height

```tsx
<Input className="h-11" />
```

### Button con Loading

```tsx
<Button disabled={loading} className="w-full h-11">
  {loading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Cargando...
    </>
  ) : (
    "Enviar"
  )}
</Button>
```

### Error Display

```tsx
{
  error && (
    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center font-medium animate-in fade-in slide-in-from-top-1">
      {error}
    </div>
  );
}
```

### Link Styling

```tsx
<Link
  href="/register"
  className="font-semibold text-primary underline-offset-4 hover:underline"
>
  Regístrate
</Link>
```

---

## Dependencias del Módulo

- `react-hook-form`
- `@hookform/resolvers`
- `zod`
- Componentes: `Button`, `Card`, `Input`, `Form`, `Label`

---

## Verificación

- [ ] Login funcional con validación
- [ ] Registro con todos los campos
- [ ] Forgot password con email
- [ ] Responsive: móvil y desktop
- [ ] Loading states en botones
- [ ] Error handling visible

# Environment Variables - Abogado Sala

Lista definitiva de variables de entorno requeridas para el funcionamiento "Zero Failure" del sistema.

## 1. Supabase (Core Infrastructure)

| Variable                        | Descripción                                                      | Required in      |
| :------------------------------ | :--------------------------------------------------------------- | :--------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL del Proyecto Supabase.                                       | Build & Runtime  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public/Anon Key para Cliente.                                    | Build & Runtime  |
| `SUPABASE_SERVICE_ROLE_KEY`     | **SECRET**. Llave omnipotente para Admin tasks (Cron, Webhooks). | Runtime (Server) |
| `SUPABASE_DB_PASSWORD`          | (Opcional) Para migraciones directas / CI.                       | CI/CD            |

## 2. Stripe (Billing Engine)

| Variable                             | Descripción                                               | Required in      |
| :----------------------------------- | :-------------------------------------------------------- | :--------------- |
| `STRIPE_SECRET_KEY`                  | **SECRET**. `sk_live_...` Para iniciar checkout y portal. | Runtime (Server) |
| `STRIPE_WEBHOOK_SECRET`              | **SECRET**. `whsec_...` Para validar payload de webhooks. | Runtime (Server) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` Para Elementos UI (si se usa Elements).     | Build & Runtime  |

## 3. App Configuration (Feature Flags)

| Variable                       | Descripción                                                                        | Default                 |
| :----------------------------- | :--------------------------------------------------------------------------------- | :---------------------- |
| `NEXT_PUBLIC_APP_URL`          | URL canónica (ej. `https://app.abogadosala.com`). Vital para Auth Redirects y SE0. | `http://localhost:3000` |
| `NEXT_PUBLIC_ENABLE_DEMO_MODE` | `true`/`false`. Habilita features de demostración pública.                         | `false`                 |
| `NEXT_PUBLIC_MAINTENANCE_MODE` | `true`. Muestra pantalla de mantenimiento global.                                  | `false`                 |

## 4. Email / Notifications (Resend/SMTP)

_Nota: Actualmente usamos Supabase Auth Emails, pero si migramos a provider externo:_

| Variable         | Descripción                             | Status |
| :--------------- | :-------------------------------------- | :----- |
| `RESEND_API_KEY` | Key para envíos transaccionales custom. | Future |

---

## ⚠️ Integrity Check

El Agente/Developer debe verificar la presencia de estas keys al iniciar (`checkEnv.ts`).

```typescript
// .agent/backend/check-env.ts example
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'STRIPE_SECRET_KEY', ...];
required.forEach(k => {
  if (!process.env[k]) throw new Error(`CRITICAL: Missing ENV ${k}`);
});
```

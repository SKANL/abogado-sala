# Billing Module - Abogado Sala

Gestión de Suscripciones y Pagos del Despacho.

## 1. Modelo de Negocio (SaaS)

El sistema opera bajo un modelo de suscripción recurrente gestionado por el **Owner**.
Los abogados empleados **NO** ven nada de esto.

### Tiers (Niveles)

1.  **Trial (14 días)**: Acceso full, sin tarjeta.
2.  **Pro (Mensual/Anual)**: Acceso a todas las features.
3.  **Enterprise**: Para despachos grandes (Custom pricing).
4.  **Demo (Beta Tester)**: Cuenta especial de duración fija (ej. 30 días) sin tarjeta.
    - **Propósito**: Para owners seleccionados por ti para probar el SaaS.
    - **Limitantes**: Marca de agua "Modo Demo" discreta en el dashboard.

---

## 2. Interfaces de Usuario (Owner Only)

### A. Estado de Suscripción (`/configuracion/facturacion`)

Una vista clara del estado actual.

- **Card Principal**:
  - "Plan Actual: **PRO**" (Badge Verde).
  - "Próximo cobro: $29 USD el 15 de Octubre".
  - Tarjeta: `•••• 4242` (Visa).
- **Acciones**:
  - `[Cambiar Plan]` -> Abre Modal de Precios.
  - `[Actualizar Método de Pago]` -> Stripe/LemonSqueezy Portal.
  - `[Cancelar Suscripción]` -> Flow de retención.

### B. Historial de Facturas

Tabla simple con las facturas fiscales.

- Columnas: Fecha, Monto, Estado (Pagado/Fallido), PDF.
- Action: `[Descargar XML/PDF]`.

### C. Flow de Upgrade (Checkout)

1.  **Pricing Table**: 3 Columnas (Basic, Pro, Custom).
2.  **Checkout**: Redirección a proveedor de pagos (Stripe Checkout) o Modal embebido.
3.  **Success**: Confeti + Redirección a Dashboard.

### D. Bloqueo por Impago & Downgrades

1. **Impago / Expiración**:
   - **Owner**: Ve una pantalla "Payment Required" al intentar entrar. Solo puede ir a pagar.
   - **Lawyer**: Ve "Cuenta del despacho suspendida. Contacta a tu administrador".
   - **Client**: Los portales siguen activos (Read-only) por un tiempo de gracia (7 días), luego 404.

2. **Downgrade (Pro -> Free) con Exceso de Uso**:
   - **Escenario**: Tienes 20 clientes, el Free permite 5.
   - **Política "Soft Block"**:
     - No borramos datos.
     - **Read-Only**: Puedes ver tus 20 clientes.
     - **Write-Block**: No puedes editar ni crear NUEVOS clientes hasta que:
       - a) Vuelvas a Pro.
       - b) Borres/Archives clientes hasta bajar de 5.
   - **Data Retention**: Si la cuenta se cancela totalmente, se mantienen datos por 90 días antes de `Hard Delete`.

3. **Prevención de "Admin Lockout" (Safety Check)**:
   - **Regla**: No permitir downgrade si `Count(Admins) > NuevoPlan.MaxAdmins`.
   - **UX**: Mostrar error: "Debes degradar a otros admins a miembros antes de cambiar al plan Free".

4. **Configuración de Límites (Anti-Hardcoding)**:
   - Los límites (5 clientes, 1 admin) NO deben estar quemados en el código. Leer de tabla `plan_configs` o constante centralizada en Backend.

### 5. Manejo de Errores de Cuota (UX)

El backend retornará el código estándar `QUOTA_EXCEEDED` (definido en contracts).
Acción:

1. **Prevenir Fallback Genérico**: No mostrar "Algo salió mal".
2. **Abrir Modal de Upgrade**: Mostrar "Has alcanzado el límite de tu plan".
3. **Analytics**: Registrar el evento `quota_hit` para ventas.

---

## 3. Componentes UI Requeridos

- `PricingTable`: Cards comparativas con checks de features.
- `CreditCardPreview`: Icono de marca (Visa/MC) + últimos 4 dígitos.
- `PaymentStatusBadge`: Paid (Verde), Overdue (Rojo).

## 4. Integración Técnica

Recomendamos usar **Stripe Customer Portal** para delegar la complejidad de:

- Cambiar tarjetas.
- Ver facturas.
- Downgrades/Upgrades complejos (Prorrateo).

Esto simplifica el frontend a solo tener un botón: `[Gestionar Facturación en Stripe]`.

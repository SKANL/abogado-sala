/**
 * Billing Configuration
 * ─────────────────────────────────────────────────────────────
 * This is the single source of truth for how billing works.
 * Switch BILLING_MODE to "stripe" when ready to process payments online.
 *
 * "manual"  → No Stripe. Access is granted/revoked manually by setting
 *             `plan_status` directly in the Supabase `organizations` table.
 *             Clients pay physically; you mark them as paid/active.
 *
 * "stripe"  → Full Stripe Checkout + Customer Portal (future).
 *             Uncomment and wire the stripe actions in billing/actions.ts.
 */
export const BILLING_MODE: "manual" | "stripe" = "manual";

/** Contact info shown in the "manual" billing mode */
export const BILLING_CONTACT = {
  email: "contacto@abogadosala.com",
  whatsapp: "", // e.g., "+525512345678"
  message: "¿Listo para activar tu plan? Contáctanos para coordinar el pago.",
};

/**
 * When true, a `past_due` plan_status shows the PaymentWall (hard block).
 * When false, `past_due` only shows the TrialBanner warning — useful for a
 * manual-billing grace period where you contact clients before cutting access.
 *
 * Flip to true once you add automated payment retries (Stripe webhooks).
 */
export const BLOCK_ON_PAST_DUE: boolean = false;

/** Plan display names */
export const PLAN_LABELS: Record<string, string> = {
  trial: "Período de Prueba",
  basic: "Básico",
  pro: "Pro",
  enterprise: "Enterprise",
  free: "Gratuito",
};

/** Status display info */
export const PLAN_STATUS_LABELS: Record<string, { label: string; description: string }> = {
  active:    { label: "Activo",            description: "Tu suscripción está al día." },
  trialing:  { label: "Período de Prueba", description: "Estás en tu período de prueba gratuito." },
  past_due:  { label: "Pago Pendiente",    description: "Hay un pago pendiente. Contáctanos para regularizar." },
  canceled:  { label: "Cancelado",         description: "Tu suscripción fue cancelada." },
  unpaid:    { label: "Sin Pagar",         description: "No se ha recibido pago. Contáctanos para activar." },
  // Computed locally when trial_ends_at has passed but plan_status is still "trialing" in DB
  expired:   { label: "Prueba Expirada",   description: "Tu período de prueba ha finalizado. Contáctanos para activar tu plan." },
};

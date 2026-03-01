/**
 * Portal Wizard — Shared Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for wizard step structure.
 *
 * Previously this was duplicated in:
 *   - src/app/(dashboard)/casos/[id]/page.tsx
 *   - src/app/(dashboard)/clientes/[id]/page.tsx
 *   - src/features/portal/components/portal-wizard.tsx
 *
 * When you add or rename a step (e.g. adding a payment-verification step),
 * change ONLY this file — all consumers auto-update.
 */

export const WIZARD_TOTAL_STEPS = 4;

/** Index → human-readable step name (used in progress bars and dashboard displays). */
export const WIZARD_STEP_NAMES: Record<number, string> = {
  0: "Bienvenida",
  1: "Consentimiento",
  2: "Información",
  3: "Documentación",
  4: "Finalizado",
};

/** Metadata used by the wizard UI for headings and progress descriptions. */
export const WIZARD_STEPS_METADATA = [
  { title: "Bienvenida",    description: "Inicio" },
  { title: "Consentimiento", description: "Términos Legales" },
  { title: "Información",   description: "Datos Básicos" },
  { title: "Documentación", description: "Carga de Archivos" },
  { title: "Finalizado",    description: "Revisión" },
] as const;

/**
 * Compute the progress percentage for a given step index.
 * Returns a value between 0 and 100.
 */
export function getWizardProgress(stepIndex: number): number {
  return Math.round((Math.min(stepIndex, WIZARD_TOTAL_STEPS) / WIZARD_TOTAL_STEPS) * 100);
}

/**
 * Returns the display name for a given step index.
 * Falls back to "Paso N" for unknown indices.
 */
export function getStepName(stepIndex: number): string {
  return WIZARD_STEP_NAMES[stepIndex] ?? `Paso ${stepIndex}`;
}

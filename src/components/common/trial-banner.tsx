"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import Link from "next/link";

/**
 * Muestra un banner cuando el plan de prueba expira en ≤ 7 días.
 * Se oculta automáticamente si el plan ya no está en trialing.
 */
export function TrialBanner() {
  const { org } = useAuth();

  if (!org || org.plan_status !== "trialing" || !org.trial_ends_at) return null;

  const trialEnd = new Date(org.trial_ends_at);
  const now = new Date();
  const diffMs = trialEnd.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Only show when 7 or fewer days remain
  if (daysLeft > 7) return null;

  const isExpired = daysLeft <= 0;

  return (
    <Alert
      className={`rounded-none border-x-0 border-t-0 ${
        isExpired
          ? "bg-destructive/10 border-destructive/30 text-destructive"
          : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300"
      }`}
    >
      <Clock className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <span>
          {isExpired
            ? "Tu período de prueba ha expirado. Actualiza tu plan para seguir usando AbogadoSala."
            : `Tu prueba gratuita expira en ${daysLeft} día${daysLeft === 1 ? "" : "s"}.`}
        </span>
        <Button
          asChild
          size="sm"
          variant={isExpired ? "destructive" : "default"}
          className="shrink-0"
        >
          <Link href="/configuracion/facturacion">
            {isExpired ? "Activar Plan" : "Ver Planes"}
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

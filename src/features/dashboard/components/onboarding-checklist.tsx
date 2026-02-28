import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ChecklistItem {
  label: string;
  description: string;
  href: string;
  done: boolean;
}

interface OnboardingChecklistProps {
  hasTemplate: boolean;
  hasClient: boolean;
  hasCase: boolean;
}

/**
 * Guía de onboarding para dashboards vacíos.
 * Se muestra cuando la organización no tiene expedientes activos ni clientes.
 */
export function OnboardingChecklist({
  hasTemplate,
  hasClient,
  hasCase,
}: OnboardingChecklistProps) {
  const items: ChecklistItem[] = [
    {
      label: "Crea tu primera plantilla",
      description: "Define los documentos y preguntas que necesitas para tus expedientes.",
      href: "/plantillas",
      done: hasTemplate,
    },
    {
      label: "Registra un cliente",
      description: "Añade los datos básicos de tu primer cliente.",
      href: "/clientes/new",
      done: hasClient,
    },
    {
      label: "Abre un expediente",
      description: "Crea el primer expediente y genera el enlace para tu cliente.",
      href: "/casos/new",
      done: hasCase,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const allDone = completedCount === items.length;

  if (allDone) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">¡Configura tu despacho! 🚀</CardTitle>
            <CardDescription className="mt-0.5">
              Completa estos pasos para empezar a usar AbogadoSala.
            </CardDescription>
          </div>
          <span className="text-xs text-muted-foreground font-medium shrink-0 mt-1">
            {completedCount}/{items.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.href}
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
              item.done
                ? "opacity-50 pointer-events-none"
                : "hover:bg-background/60"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.done ? "line-through" : ""}`}>
                {item.label}
              </p>
              {!item.done && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              )}
            </div>
            {!item.done && (
              <Button asChild size="sm" variant="outline" className="shrink-0 h-7 text-xs">
                <Link href={item.href}>
                  Empezar
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

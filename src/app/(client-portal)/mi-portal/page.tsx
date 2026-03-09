import { Suspense } from "react";
import { getClientPortalCasesAction } from "@/features/portal/actions/client-portal";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, AlertCircle, ChevronRight, FolderOpen } from "lucide-react";
import { getWizardProgress, getStepName } from "@/features/portal/config";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active:    { label: "Activo",    variant: "default" },
  pending:   { label: "Pendiente", variant: "secondary" },
  completed: { label: "Completado", variant: "outline" },
  on_hold:   { label: "En espera", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

async function PortalCasesList() {
  const result = await getClientPortalCasesAction();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "cliente";

  if (!result.success || !result.data) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No se pudieron cargar tus expedientes.</p>
      </div>
    );
  }

  const cases = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hola, {firstName}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {cases.length === 0
            ? "Aún no tienes expedientes asignados."
            : `Tienes ${cases.length} expediente${cases.length !== 1 ? "s" : ""}.`}
        </p>
      </div>

      {cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 border-2 border-dashed rounded-lg bg-muted/20">
          <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
          <div className="text-center space-y-1">
            <p className="font-medium text-sm">Sin expedientes</p>
            <p className="text-xs text-muted-foreground">Tu despacho aún no ha abierto ningún expediente contigo.</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border overflow-hidden bg-card">
          {cases.map((c) => {
            const status = STATUS_LABELS[c.status] ?? { label: c.status, variant: "secondary" as const };
            const progress = getWizardProgress(c.current_step_index ?? 0);
            const stepName = getStepName(c.current_step_index ?? 0);
            const hasPending = c.files_pending > 0;

            return (
              <Link
                key={c.id}
                href={`/mi-portal/casos/${c.id}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors group"
              >
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.template_name && (
                      <span className="font-medium text-sm truncate">{c.template_name}</span>
                    )}
                    <Badge variant={status.variant} className="text-[11px] h-4 px-1.5 shrink-0">
                      {status.label}
                    </Badge>
                    {hasPending && (
                      <Badge variant="destructive" className="text-[11px] h-4 px-1.5 shrink-0 gap-0.5">
                        <AlertCircle className="h-2.5 w-2.5" />
                        {c.files_pending} pendiente{c.files_pending !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>

                  {c.status !== "completed" && (
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{stepName}</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    Abierto el {new Date(c.created_at).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ClientPortalPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
      </div>
    }>
      <PortalCasesList />
    </Suspense>
  );
}

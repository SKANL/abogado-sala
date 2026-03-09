import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getClientPortalCaseAction } from "@/features/portal/actions/client-portal";
import { DocumentUploadSlot } from "@/features/portal/components/document-upload-slot";
import { CaseUpdatesTimeline } from "@/features/cases/components/case-updates-timeline";
import { PortalCompletedScreen } from "@/features/portal/components/portal-completed-screen";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, FolderOpen, Activity, Calendar } from "lucide-react";
import Link from "next/link";
import { getWizardProgress, getStepName } from "@/features/portal/config";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active:    { label: "Activo",     variant: "default" },
  pending:   { label: "Pendiente",  variant: "secondary" },
  completed: { label: "Completado", variant: "outline" },
  on_hold:   { label: "En espera",  variant: "secondary" },
  cancelled: { label: "Cancelado",  variant: "destructive" },
};

async function CaseDetailContent({ caseId }: { caseId: string }) {
  const result = await getClientPortalCaseAction(caseId);

  if (!result.success || !result.data) notFound();

  const c = result.data;
  const status = STATUS_LABELS[c.status] ?? { label: c.status, variant: "secondary" as const };

  if (c.status === "completed") {
    return (
      <PortalCompletedScreen
        clientName=""
        caseToken={c.token}
        files={[]}
      />
    );
  }

  const progress = getWizardProgress(c.current_step_index ?? 0);
  const stepName = getStepName(c.current_step_index ?? 0);

  const updates = c.updates.map((u) => ({
    ...u,
    author_name: null,
  }));

  const uploadableFiles = c.files.filter(
    (f) => f.status === "pending" || f.status === "rejected" || f.status === "missing"
  );
  const reviewedFiles = c.files.filter(
    (f) => f.status === "uploaded" || f.status === "approved"
  );

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-muted-foreground -ml-2">
          <Link href="/mi-portal">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Mis expedientes
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold tracking-tight">Mi Expediente</h1>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{stepName}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        {c.expires_at && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Vence: {new Date(c.expires_at).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents">
        <TabsList className="w-full grid grid-cols-2 h-10">
          <TabsTrigger value="documents" className="gap-1.5">
            <FolderOpen className="h-4 w-4" />
            Mis Documentos
            {uploadableFiles.length > 0 && (
              <span className="ml-1 text-[10px] font-semibold bg-destructive/20 text-destructive rounded-full px-1.5 py-0.5">
                {uploadableFiles.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="updates" className="gap-1.5">
            <Activity className="h-4 w-4" />
            Estado del Caso
            {updates.length > 0 && (
              <span className="ml-1 text-[10px] font-semibold bg-primary/15 text-primary rounded-full px-1.5 py-0.5">
                {updates.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4 space-y-4">
          {/* Files to upload */}
          {uploadableFiles.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-destructive">
                  Documentos requeridos
                </CardTitle>
                <CardDescription>Por favor sube los siguientes documentos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {uploadableFiles.map((file) => (
                  <DocumentUploadSlot
                    key={file.id}
                    caseId={c.id}
                    fileId={file.id}
                    category={file.category}
                    description={file.description}
                    status={file.status as "pending" | "rejected" | "missing"}
                    reviewNote={file.review_note}
                    token={c.token}
                    onSuccess={() => {}}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Already uploaded / approved */}
          {reviewedFiles.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Documentos entregados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reviewedFiles.map((file) => (
                  <DocumentUploadSlot
                    key={file.id}
                    caseId={c.id}
                    fileId={file.id}
                    category={file.category}
                    description={file.description}
                    status={file.status as "uploaded" | "approved"}
                    reviewNote={file.review_note}
                    token={c.token}
                    onSuccess={() => {}}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {c.files.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              Sin documentos requeridos para este expediente.
            </div>
          )}
        </TabsContent>

        <TabsContent value="updates" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Novedades de tu expediente</CardTitle>
            </CardHeader>
            <CardContent>
              <CaseUpdatesTimeline
                updates={updates}
                canDelete={false}
                emptyMessage="Tu abogado aún no ha publicado actualizaciones sobre tu expediente."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default async function ClientPortalCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
      <CaseDetailContent caseId={id} />
    </Suspense>
  );
}

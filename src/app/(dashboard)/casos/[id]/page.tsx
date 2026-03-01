import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Calendar, FileText, ClipboardList, ArrowLeft, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { CaseActionsDropdown } from "@/features/cases/components/case-actions-menu";
import { CaseFilesList } from "@/features/cases/components/case-files-list";
import { CaseRealtimeListener } from "@/features/cases/components/case-realtime-listener";
import { CaseStatusSelector } from "@/features/cases/components/case-status-selector";
import { CaseNotes } from "@/features/cases/components/case-notes";
import { CaseAssigneeSelector } from "@/features/cases/components/case-assignee-selector";
import { ShareCaseButtons } from "@/features/cases/components/share-case-buttons";
import { getStepName, getWizardProgress } from "@/features/portal/config";
import { getCaseById, getOrgTeam, getCaseNotes } from "@/lib/db/queries";

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role ?? "member";
  const isOwnerAdmin = role === "owner" || role === "admin";
  const orgId = user?.app_metadata?.org_id as string;

  // Parallel fetch — all cached, revalidated by Server Actions
  const [{ data: c, error }, teamMembers, rawNotes] = await Promise.all([
    getCaseById(id, orgId),
    isOwnerAdmin ? getOrgTeam(orgId) : Promise.resolve([]),
    getCaseNotes(id),
  ]);

  if (error || !c) notFound();

  const notes = rawNotes.map((n) => ({ ...n, author: Array.isArray(n.author) ? n.author[0] ?? null : n.author }));

  const stepIdx = c.current_step_index ?? 0;
  const progressPct = getWizardProgress(stepIdx);
  const stepName = getStepName(stepIdx);

  return (
    <div className="space-y-6">
      <CaseRealtimeListener caseId={id} />

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-muted-foreground">
              <Link href="/casos">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Expedientes
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {c.client?.full_name ?? "Expediente"}
            </h1>
            <CaseStatusSelector caseId={c.id} currentStatus={c.status} />
            {/* UUID in a tooltip — available but not visually prominent */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-[11px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors border border-dashed border-border rounded px-1.5 py-0.5"
                    aria-label="ID del expediente"
                  >
                    {c.id.substring(0, 8)}…
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-mono text-xs max-w-70 break-all">
                  {c.id}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShareCaseButtons token={c.token} />
          <CaseActionsDropdown caseId={c.id} currentStatus={c.status} />
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Tabs */}
        <div className="space-y-6 lg:col-span-2">
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="w-full justify-start p-1 h-auto overflow-x-auto">
              <TabsTrigger value="documents" className="gap-1.5 whitespace-nowrap">
                <FileText className="h-3.5 w-3.5" /> Documentación
              </TabsTrigger>
              <TabsTrigger value="questionnaire" className="gap-1.5 whitespace-nowrap">
                <ClipboardList className="h-3.5 w-3.5" /> Cuestionario
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5 whitespace-nowrap">
                <StickyNote className="h-3.5 w-3.5" />
                Notas Internas
                {notes.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                    {notes.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Archivos del Expediente
                  </CardTitle>
                  <CardDescription>Documentos subidos por el cliente o el despacho.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CaseFilesList files={c.files || []} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="questionnaire" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" /> Respuestas del Cliente
                  </CardTitle>
                  <CardDescription>Datos recopilados a través del cuestionario inicial.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {c.questionnaire_answers && Object.keys(c.questionnaire_answers as object).length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {Object.entries(c.questionnaire_answers as Record<string, string>).map(([key, value]) => {
                        const field = (c.template_snapshot as Record<string, { label?: string }>)?.[key];
                        const label = field?.label || key;
                        return (
                          <div key={key} className="p-3 bg-muted/20 rounded-md border">
                            <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">{label}</span>
                            <span className="font-medium text-foreground wrap-break-word">{String(value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <ClipboardList className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">El cliente aún no ha completado el cuestionario</p>
                        <p className="text-xs text-muted-foreground">Comparte el enlace del portal para que el cliente pueda responder.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="h-4 w-4" /> Notas Internas
                  </CardTitle>
                  <CardDescription>Solo visibles para el equipo. El cliente nunca las ve.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CaseNotes
                    caseId={id}
                    initialNotes={notes}
                    currentUserId={user!.id}
                    canDeleteAll={isOwnerAdmin}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Nombre</span>
                <span className="font-medium">{c.client?.full_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Email</span>
                <span className="break-all">{c.client?.email || "No registrado"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Teléfono</span>
                <span>{(c.client as { phone?: string | null })?.phone || 'No registrado'}</span>
              </div>
              <div className="pt-2">
                <Button variant="secondary" size="sm" className="w-full" asChild>
                  <Link href={`/clientes/${c.client_id}`}>Ver Perfil Cliente</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Progreso del Portal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paso actual</span>
                <span className="font-semibold text-right">{stepName}</span>
              </div>
              <div className="space-y-1.5">
                <Progress value={progressPct} className="h-2" />
                <p className="text-xs text-muted-foreground text-right tabular-nums">{progressPct}% completado</p>
              </div>
              <div className="flex items-center justify-between text-sm pt-1">
                <span className="text-muted-foreground">Vencimiento</span>
                <span className="flex items-center gap-1 text-right">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString("es-MX", { timeZone: "UTC" }) : "Indefinido"}
                </span>
              </div>
            </CardContent>
          </Card>

          {(isOwnerAdmin || c.assigned_to) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Asignación</CardTitle>
              </CardHeader>
              <CardContent>
                <CaseAssigneeSelector
                  caseId={id}
                  currentAssigneeId={c.assigned_to ?? null}
                  teamMembers={teamMembers}
                  canAssign={isOwnerAdmin}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

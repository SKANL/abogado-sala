import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientForm } from "@/features/clients/components/client-form";
import { ClientAssigneeSelector } from "@/features/clients/components/client-assignee-selector";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { FileText, User, ArrowLeft, FolderOpen, ExternalLink } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { getStepName, getWizardProgress } from "@/features/portal/config";
import { getClientById, getClientCases, getOrgTeam, getOrgSettings } from "@/lib/db/queries";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { id } = await params;
    const { data: { user } } = await supabase.auth.getUser();
    const orgId = user?.app_metadata?.org_id as string;
    const userId = user?.id as string;
    const role = (user?.app_metadata?.role ?? "member") as string;
    const isOwnerAdmin = role === "owner" || role === "admin";
    const isMember = !isOwnerAdmin;

    // All cached — revalidated when client/case data changes
    const [client, cases, teamMembers, orgSettings] = await Promise.all([
        getClientById(id, orgId),
        getClientCases(id, orgId),
        isOwnerAdmin ? getOrgTeam(orgId) : Promise.resolve([]),
        isMember ? getOrgSettings(orgId) : Promise.resolve(null),
    ]);

    if (!client) {
        notFound();
    }

    // Guard: members who cannot see all clients may only view their assigned clients
    if (isMember) {
        const membersCanSeeAll = orgSettings?.members_can_see_all_clients ?? false;
        const assignedLawyerId = (client as { assigned_lawyer_id?: string | null }).assigned_lawyer_id;
        if (!membersCanSeeAll && assignedLawyerId !== userId) {
            notFound();
        }
    }

    const firstActiveCase = cases.find(c => c.status === "in_progress" || c.status === "review") ?? cases[0];

    // Map team members with workload counts
    const mappedTeam = teamMembers.map((m) => {
        const casesData = m.cases as { count: number }[] | undefined;
        return {
            id: m.id,
            full_name: m.full_name,
            avatar_url: m.avatar_url,
            role: m.role,
            activeCases: casesData?.[0]?.count ?? 0,
        };
    });

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2 mb-1">
                        <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-muted-foreground">
                            <Link href="/clientes">
                                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Clientes
                            </Link>
                        </Button>
                    </div>
                    <h1 className="text-xl font-semibold tracking-tight">{client.full_name}</h1>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={client.status} />
                        <p className="text-sm text-muted-foreground italic">
                            Registrado el {new Date(client.created_at).toLocaleDateString("es-MX", { timeZone: "UTC" })}
                        </p>
                    </div>
                    {/* Assignee selector below the status row */}
                    <div className="pt-1">
                        <ClientAssigneeSelector
                            clientId={client.id}
                            currentAssigneeId={(client as { assigned_lawyer_id?: string | null }).assigned_lawyer_id ?? null}
                            teamMembers={mappedTeam}
                            canAssign={isOwnerAdmin}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 pt-1">
                    {firstActiveCase ? (
                        <Button size="sm" asChild>
                            <Link href={`/casos/${firstActiveCase.id}`}>
                                <FolderOpen className="mr-2 h-4 w-4" />
                                Expediente activo
                            </Link>
                        </Button>
                    ) : (
                        <Button size="sm" variant="outline" asChild>
                            <Link href={`/casos/new?client_id=${client.id}`}>
                                <FolderOpen className="mr-2 h-4 w-4" />
                                Nuevo Expediente
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            <Tabs defaultValue="details" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="details" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Detalles
                    </TabsTrigger>
                    <TabsTrigger value="cases" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Expedientes ({cases?.length || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información del Cliente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ClientForm initialData={client} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="cases">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Expedientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {cases && cases.length > 0 ? (
                                <div className="divide-y">
                                    {cases.map((c) => {
                                        const stepIdx = c.current_step_index ?? 0;
                                        const progressPct = getWizardProgress(stepIdx);
                                        const stepName = getStepName(stepIdx);
                                        return (
                                            <Link
                                                key={c.id}
                                                href={`/casos/${c.id}`}
                                                className="flex items-center justify-between py-4 px-2 hover:bg-muted/40 rounded-lg transition-colors group"
                                            >
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                                        <FolderOpen className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="min-w-0 flex-1 space-y-1.5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-sm font-mono text-muted-foreground">
                                                                {c.id.slice(0, 8)}&hellip;
                                                            </span>
                                                            <StatusBadge status={c.status} />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Progress value={progressPct} className="h-1.5 flex-1 max-w-30" />
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                {stepName} &middot; {progressPct}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-4">
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(c.created_at).toLocaleDateString("es-MX", { timeZone: "UTC" })}
                                                    </span>
                                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-10 space-y-2">
                                    <FolderOpen className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                                    <p className="text-sm text-muted-foreground">Este cliente no tiene expedientes registrados.</p>
                                    <Button variant="outline" size="sm" asChild className="mt-2">
                                        <Link href={`/casos/new?client_id=${client.id}`}>Crear expediente</Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

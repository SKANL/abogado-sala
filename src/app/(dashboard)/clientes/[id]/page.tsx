import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientForm } from "@/features/clients/components/client-form";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { FileText, User, ArrowLeft, FolderOpen, ExternalLink } from "lucide-react";
import Link from "next/link";
import { STATUS_LABELS, STATUS_CLASSES } from "@/lib/constants";

const WIZARD_TOTAL_STEPS = 4;
const STEP_NAMES: Record<number, string> = {
  0: "Bienvenida",
  1: "Consentimiento",
  2: "Información",
  3: "Documentación",
  4: "Finalizado",
};

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { id } = await params;

    // 1. Fetch Client
    const { data: client } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

    if (!client) {
        notFound();
    }

    // 2. Fetch Cases
    const { data: cases } = await supabase
        .from("cases")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });

    const firstActiveCase = cases?.find(c => c.status === "in_progress" || c.status === "review") ?? cases?.[0];

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
                        <Badge
                            variant="outline"
                            className={STATUS_CLASSES[client.status] ?? ""}
                        >
                            {STATUS_LABELS[client.status] ?? client.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground italic">
                            Registrado el {new Date(client.created_at).toLocaleDateString("es-MX", { timeZone: "UTC" })}
                        </p>
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
                                        const progressPct = Math.round((stepIdx / WIZARD_TOTAL_STEPS) * 100);
                                        const stepName = STEP_NAMES[stepIdx] ?? `Paso ${stepIdx}`;
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
                                                            <Badge variant="outline" className={STATUS_CLASSES[c.status] ?? ""}>
                                                                {STATUS_LABELS[c.status] || c.status}
                                                            </Badge>
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
                                        <Link href="/casos/new">Crear expediente</Link>
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

import { createClient } from "@/lib/supabase/server";
import { CaseForm } from "@/features/cases/components/case-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Users, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getClientsForSelector, getTemplatesForSelector } from "@/lib/db/queries";

export default async function NewCasePage({
    searchParams,
}: {
    searchParams: Promise<{ client_id?: string }>;
}) {
    const supabase = await createClient();
    const { client_id } = await searchParams;
    const { data: { user } } = await supabase.auth.getUser();
    const orgId = user?.app_metadata?.org_id as string;

    // Both cached — revalidated when clients/templates change
    const [clients, templates] = await Promise.all([
        getClientsForSelector(orgId),
        getTemplatesForSelector(orgId),
    ]);

    const hasClients = (clients?.length ?? 0) > 0;
    const hasTemplates = (templates?.length ?? 0) > 0;

    // Resolve the preselected client name for the heading
    const preselectedClient = client_id
        ? clients?.find(c => c.id === client_id)
        : undefined;

    // Block render if prerequisites are missing — guide the user instead
    if (!hasClients || !hasTemplates) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <PageHeader
                    title="Nuevo Expediente"
                    description="Antes de crear un expediente, necesitas algunos requisitos."
                />

                <Alert variant="default" className="border-warning/50 bg-warning/10">
                    <AlertCircle className="h-4 w-4 text-warning-foreground" />
                    <AlertTitle>Requisitos pendientes</AlertTitle>
                    <AlertDescription>
                        Para crear un expediente necesitas al menos un cliente registrado y una plantilla activa.
                    </AlertDescription>
                </Alert>

                <div className="grid sm:grid-cols-2 gap-4">
                    {/* Needs templates */}
                    {!hasTemplates && (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                                <div className="rounded-full bg-primary/10 p-3">
                                    <FileText className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold">Sin plantillas</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Las plantillas definen el formulario y los documentos que pedirá el expediente.
                                    </p>
                                </div>
                                <Button asChild className="w-full">
                                    <Link href="/plantillas/new">Crear primera plantilla</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Needs clients */}
                    {!hasClients && (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                                <div className="rounded-full bg-primary/10 p-3">
                                    <Users className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold">Sin clientes</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Registra al cliente antes de abrir su expediente.
                                    </p>
                                </div>
                                <Button asChild className="w-full">
                                    <Link href="/clientes/new">Registrar cliente</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <PageHeader
                title="Nuevo Expediente"
                description={preselectedClient
                    ? `Iniciando trámite para ${preselectedClient.full_name}.`
                    : "Inicia un nuevo trámite para un cliente."}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Detalles del Expediente</CardTitle>
                </CardHeader>
                <CardContent>
                    <CaseForm
                        clients={clients || []}
                        templates={(templates || []) as Parameters<typeof CaseForm>[0]['templates']}
                        preselectedClientId={client_id}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

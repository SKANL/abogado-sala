import { createClient } from "@/lib/supabase/server";
import { CaseForm } from "@/features/cases/components/case-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default async function NewCasePage({
    searchParams,
}: {
    searchParams: Promise<{ client_id?: string }>;
}) {
    const supabase = await createClient();
    const { client_id } = await searchParams;
    
    // Fetch active clients for the selector
    const { data: clients } = await supabase
        .from("clients")
        .select("id, full_name")
        .in("status", ["active", "prospect"])
        .order("full_name");

    // Fetch available templates
    const { data: templates } = await supabase
        .from("templates")
        .select("id, title, schema")
        .order("created_at", { ascending: false });

    // Resolve the preselected client name for the heading
    const preselectedClient = client_id
        ? clients?.find(c => c.id === client_id)
        : undefined;

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
                        templates={templates || []}
                        preselectedClientId={client_id}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

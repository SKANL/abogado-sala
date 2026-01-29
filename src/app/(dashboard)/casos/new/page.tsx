import { createClient } from "@/lib/supabase/server";
import { CaseForm } from "@/features/cases/components/case-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewCasePage() {
    const supabase = await createClient();
    
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

    return (
        <div className="max-w-2xl mx-auto space-y-6">
             <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Nuevo Expediente</h1>
                <p className="text-muted-foreground">Inicia un nuevo trámite para un cliente.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detalles del Expediente</CardTitle>
                </CardHeader>
                <CardContent>
                    <CaseForm clients={clients || []} templates={templates || []} />
                </CardContent>
            </Card>
        </div>
    );
}

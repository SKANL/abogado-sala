import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TemplateBuilder } from "@/features/templates/components/template-builder";

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { id } = await params;

    const { data: template } = await supabase
        .from("templates")
        .select("*")
        .eq("id", id)
        .single();

    if (!template) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Editar Plantilla</h1>
                <p className="text-muted-foreground">Modifica la estructura y campos de tu plantilla.</p>
            </div>

            <TemplateBuilder initialData={template} />
        </div>
    );
}

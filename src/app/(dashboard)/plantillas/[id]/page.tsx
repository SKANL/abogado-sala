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
        <div className="flex flex-col gap-3 h-full">
            <div className="space-y-0.5 shrink-0">
                <h1 className="text-xl font-semibold tracking-tight">Editar Plantilla</h1>
                <p className="text-sm text-muted-foreground">Modifica la estructura y campos de tu plantilla.</p>
            </div>
            <div className="flex-1 min-h-0">
                <TemplateBuilder initialData={template} />
            </div>
        </div>
    );
}

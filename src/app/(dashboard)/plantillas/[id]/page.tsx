import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TemplateBuilder } from "@/features/templates/components/template-builder";
import { PageHeader } from "@/components/ui/page-header";

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
            <div className="shrink-0">
                <PageHeader
                    title="Editar Plantilla"
                    description="Modifica la estructura y campos de tu plantilla."
                />
            </div>
            <div className="flex-1 min-h-0">
                <TemplateBuilder initialData={template} />
            </div>
        </div>
    );
}

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TemplateBuilder } from "@/features/templates/components/template-builder";
import { PageHeader } from "@/components/ui/page-header";
import { getTemplateById } from "@/lib/db/queries";

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { id } = await params;
    const { data: { user } } = await supabase.auth.getUser();
    const orgId = user?.app_metadata?.org_id as string;

    // Cached — revalidated when template changes
    const template = await getTemplateById(id, orgId);

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
                <TemplateBuilder initialData={template as Parameters<typeof TemplateBuilder>[0]['initialData']} />
            </div>
        </div>
    );
}

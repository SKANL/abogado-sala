import { TemplateBuilder } from "@/features/templates/components/template-builder";
import { PageHeader } from "@/components/ui/page-header";

export default function NewTemplatePage() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="shrink-0">
        <PageHeader
          title="Nueva Plantilla"
          description="Define la estructura de campos para nuevos expedientes."
        />
      </div>
      <div className="flex-1 min-h-0">
        <TemplateBuilder />
      </div>
    </div>
  );
}

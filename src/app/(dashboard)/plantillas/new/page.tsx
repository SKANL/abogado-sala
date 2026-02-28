import { TemplateBuilder } from "@/features/templates/components/template-builder";

export default function NewTemplatePage() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="space-y-0.5 shrink-0">
        <h2 className="text-xl font-semibold tracking-tight">Nueva Plantilla</h2>
        <p className="text-sm text-muted-foreground">
          Define la estructura de campos para nuevos expedientes.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <TemplateBuilder />
      </div>
    </div>
  );
}

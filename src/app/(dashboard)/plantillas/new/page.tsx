import { TemplateBuilder } from "@/features/templates/components/template-builder";

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Nueva Plantilla</h2>
        <p className="text-muted-foreground">
          Define la estructura de campos para nuevos expedientes.
        </p>
      </div>
      <TemplateBuilder />
    </div>
  );
}

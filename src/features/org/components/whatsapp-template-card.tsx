"use client";

import { useState, useRef, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { setWhatsappTemplateAction } from "@/features/org/actions";
import { toast } from "sonner";
import { MessageCircle, RotateCcw, Eye, EyeOff } from "lucide-react";

const DEFAULT_TEMPLATE =
  "Hola {client_name} 👋, te compartimos el enlace para acceder a tu expediente en el portal de *{org_name}*:\n\n{link}\n\nPor favor revisa los documentos y completa la información solicitada. ¡Estamos para apoyarte!";

const VARIABLES = [
  { key: "{client_name}", label: "Nombre del cliente", example: "Juan Pérez" },
  { key: "{org_name}", label: "Nombre del despacho", example: "Despacho Ejemplo" },
  { key: "{link}", label: "Enlace al portal", example: "https://tusitio.com/sala/..." },
] as const;

function renderPreview(template: string, orgName: string): string {
  return template
    .replace(/\{client_name\}/g, "Juan Pérez")
    .replace(/\{org_name\}/g, orgName || "tu despacho")
    .replace(/\{link\}/g, "https://tusitio.com/sala/abc123");
}

interface WhatsAppTemplateCardProps {
  currentTemplate: string | null;
  orgName: string;
  isOwnerAdmin: boolean;
}

export function WhatsAppTemplateCard({
  currentTemplate,
  orgName,
  isOwnerAdmin,
}: WhatsAppTemplateCardProps) {
  const [template, setTemplate] = useState(currentTemplate ?? DEFAULT_TEMPLATE);
  const [showPreview, setShowPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasUnsavedChanges = template !== (currentTemplate ?? DEFAULT_TEMPLATE);
  const isValid = template.includes("{link}");

  /** Insert a variable at the cursor position in the textarea. */
  const insertVariable = (variable: string) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart ?? template.length;
    const end = el.selectionEnd ?? template.length;
    const newValue = template.substring(0, start) + variable + template.substring(end);
    setTemplate(newValue);
    // Restore cursor after inserted text
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    });
  };

  const handleSave = () => {
    if (!isValid) return;
    startTransition(async () => {
      const result = await setWhatsappTemplateAction(template);
      if (result.success) {
        toast.success("Plantilla guardada", {
          description: "El nuevo mensaje se usará al compartir expedientes por WhatsApp.",
        });
      } else {
        toast.error(result.error ?? "No se pudo guardar la plantilla");
      }
    });
  };

  const handleReset = () => {
    setTemplate(DEFAULT_TEMPLATE);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[#25D366]" />
          <CardTitle className="text-base">Mensaje de WhatsApp</CardTitle>
        </div>
        <CardDescription>
          Personaliza el mensaje que se pre-carga al compartir un expediente por WhatsApp. Usa las
          variables para personalizarlo con datos del cliente y tu despacho.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Variable chips */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Variables disponibles — haz clic para insertar en el mensaje:
          </p>
          <div className="flex flex-wrap gap-2">
            {VARIABLES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => insertVariable(key)}
                disabled={!isOwnerAdmin}
                title={label}
                className="inline-flex items-center rounded-md border border-dashed border-border bg-muted/50 px-2 py-0.5 font-mono text-xs text-foreground hover:border-primary hover:bg-primary/5 transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Template textarea */}
        <div className="space-y-1.5">
          <Textarea
            ref={textareaRef}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            disabled={!isOwnerAdmin || isPending}
            rows={6}
            placeholder="Escribe tu mensaje aquí..."
            className="font-mono text-sm resize-y"
            spellCheck={false}
          />
          {!isValid && (
            <p className="text-xs text-destructive">
              El mensaje debe incluir la variable <code className="font-mono">{"{link}"}</code> para
              que el cliente reciba el enlace al portal.
            </p>
          )}
          {isValid && (
            <p className="text-xs text-muted-foreground">
              {template.length} caracteres · El enlace real se insertará al compartir.
            </p>
          )}
        </div>

        {/* Preview toggle */}
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? "Ocultar vista previa" : "Ver vista previa del mensaje"}
          </button>
          {showPreview && (
            <pre className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
              {renderPreview(template, orgName)}
            </pre>
          )}
        </div>

        {/* Actions */}
        {isOwnerAdmin && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={handleReset}
              disabled={isPending || template === DEFAULT_TEMPLATE}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restablecer predeterminado
            </Button>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-amber-600 border-amber-400 text-[11px]">
                  Sin guardar
                </Badge>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isPending || !isValid || !hasUnsavedChanges}
              >
                {isPending ? "Guardando…" : "Guardar plantilla"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

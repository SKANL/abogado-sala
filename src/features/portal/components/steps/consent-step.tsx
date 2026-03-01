"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ShieldCheck, ChevronDown } from "lucide-react";

interface ConsentStepProps {
  onNext: () => Promise<void>;
  /** Custom consent text from the organization's settings */
  consentText?: string | null;
}

const DEFAULT_CONSENT = `1. Objeto del Servicio
La plataforma Abogado Sala facilita la gestión de expedientes legales de forma digital, permitiendo la recopilación segura de documentos e información necesaria para su trámite legal.

2. Privacidad de Datos
Sus datos personales y documentos están protegidos mediante cifrado. Solo el personal autorizado del despacho tendrá acceso a su información. No compartimos sus datos con terceros sin su consentimiento explícito.

3. Veracidad de la Información
Usted declara que toda la información proporcionada a través de este portal es verídica, completa y le corresponde personalmente. Cualquier falsedad podrá tener consecuencias legales.

4. Uso de Documentos
Los documentos que usted cargue serán utilizados exclusivamente para los fines del trámite legal contratado con el despacho. Podrá solicitar la eliminación de sus datos en cualquier momento contactando a su abogado.

5. Firma Electrónica
Al marcar la casilla de aceptación y hacer clic en "Aceptar y Continuar", usted reconoce este acto como su firma electrónica simple, con plena validez legal conforme a la legislación aplicable.

6. Consentimiento Informado
Al continuar, confirma que ha leído, comprendido y acepta voluntariamente los presentes términos para el procesamiento de su información legal a través de este portal seguro.`;

export function ConsentStep({ onNext, consentText }: ConsentStepProps) {
  const [accepted, setAccepted] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const text = consentText || DEFAULT_CONSENT;
  const canAccept = hasScrolledToBottom;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const threshold = 30; // px from bottom considered "scrolled to bottom"
    const reachedBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    if (reachedBottom) setHasScrolledToBottom(true);
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    }
  };

  const handleContinue = async () => {
    if (!accepted || !hasScrolledToBottom) return;
    setIsSubmitting(true);
    try {
      await onNext();
    } catch (error) {
      console.error("Error advancing step:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Términos y Consentimiento
          </CardTitle>
          <CardDescription>
            Lee los términos completos antes de continuar. Es obligatorio leerlos hasta el final.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scrollable consent text */}
          <div className="relative" ref={scrollAreaRef}>
            <ScrollArea
              className="h-70 w-full rounded-md border bg-muted/20"
              onScrollCapture={handleScroll}
            >
              <div className="p-4 text-sm leading-relaxed whitespace-pre-line text-foreground/80">
                {text}
              </div>
            </ScrollArea>

            {/* Scroll hint — fades out once the user has scrolled to the bottom */}
            {!hasScrolledToBottom && (
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-background/80 to-transparent flex items-end justify-center pb-2 pointer-events-none rounded-b-md">
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="pointer-events-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur-sm border rounded-full px-3 py-1 shadow-sm"
                  aria-label="Desplazarse al final"
                >
                  <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
                  Desplázate para leer todo
                </button>
              </div>
            )}
          </div>

          {/* Acceptance checkbox — only active after scrolling to bottom */}
          <div
            className={`flex items-start space-x-3 pt-4 border-t transition-opacity ${
              canAccept ? "opacity-100" : "opacity-40 pointer-events-none"
            }`}
          >
            <Checkbox
              id="terms"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
              disabled={!canAccept}
              aria-required="true"
            />
            <Label
              htmlFor="terms"
              className="text-sm leading-snug cursor-pointer peer-disabled:cursor-not-allowed"
            >
              He leído y comprendido los términos anteriores, y acepto voluntariamente continuar con
              el proceso.
            </Label>
          </div>

          {!canAccept && (
            <p className="text-xs text-muted-foreground text-center" role="status" aria-live="polite">
              Debes leer los términos completos antes de poder aceptar.
            </p>
          )}

          <Button
            onClick={handleContinue}
            disabled={!accepted || !hasScrolledToBottom || isSubmitting}
            className="w-full"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aceptar y Continuar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

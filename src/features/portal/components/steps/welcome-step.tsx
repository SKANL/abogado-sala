"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, Clock, FileText, CheckCircle2 } from "lucide-react";

interface WelcomeStepProps {
  clientName: string;
  onNext: () => void;
}

export function WelcomeStep({ clientName, onNext }: WelcomeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {clientName}</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Estamos listos para comenzar tu trámite. Por favor sigue los pasos para completar tu expediente.
        </p>
        {/* Time estimate badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Aproximadamente <strong className="text-foreground">5 minutos</strong>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Antes de empezar</CardTitle>
          <CardDescription>
            Necesitarás tener a la mano lo siguiente:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2.5">
            {[
              "Identificación oficial (foto o escaneo)",
              "Comprobante de domicilio reciente",
              "Cualquier documento relacionado con tu trámite",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3 mt-3">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            Acepta, completa el cuestionario y sube tus documentos en pasos sencillos.
          </div>

          <Button onClick={onNext} size="lg" className="w-full">
            Comenzar Trámite <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

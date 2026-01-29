"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface WelcomeStepProps {
  clientName: string;
  onNext: () => void;
}

export function WelcomeStep({ clientName, onNext }: WelcomeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {clientName}</h1>
        <p className="text-muted-foreground">
          Estamos listos para comenzar tu trámite. Por favor sigue los pasos para completar tu expediente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Antes de empezar</CardTitle>
          <CardDescription>
            Necesitarás tener a la mano documentos digitales (fotos o escaneos) de tu identificación y comprobante de domicilio.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pt-4">
          <Button onClick={onNext} size="lg" className="w-full md:w-auto">
            Comenzar Trámite <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

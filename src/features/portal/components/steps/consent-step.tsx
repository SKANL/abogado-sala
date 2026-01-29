"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface ConsentStepProps {
  onNext: () => Promise<void>;
}

export function ConsentStep({ onNext }: ConsentStepProps) {
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!accepted) return;
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
          <CardTitle>Términos y Condiciones</CardTitle>
          <CardDescription>
            Por favor lee y acepta los términos para continuar con el servicio legal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/20 text-sm leading-relaxed">
            <p className="font-semibold mb-2">1. Objeto del Servicio</p>
            <p className="mb-4">
              La plataforma Abogado Sala facilita la gestión de expedientes legales de forma digital...
            </p>
            <p className="font-semibold mb-2">2. Privacidad de Datos</p>
            <p className="mb-4">
              Sus datos están protegidos y encriptados. Solo el personal autorizado del despacho tendrá acceso...
            </p>
            <p className="font-semibold mb-2">3. Responsabilidad</p>
            <p className="mb-4">
              Usted declara que la información proporcionada es verídica y corresponde a su persona...
            </p>
             <p className="font-semibold mb-2">4. Firma Electrónica</p>
            <p>
              Al hacer clic en "Aceptar", usted reconoce este acto como su firma electrónica simple, con plena validez legal.
            </p>
          </ScrollArea>

          <div className="flex items-center space-x-2 pt-4 border-t">
            <Checkbox 
              id="terms" 
              checked={accepted} 
              onCheckedChange={(checked) => setAccepted(checked as boolean)} 
            />
            <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              He leído y acepto los términos y condiciones del servicio.
            </Label>
          </div>

          <Button 
            onClick={handleContinue} 
            disabled={!accepted || isSubmitting} 
            className="w-full mt-4"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aceptar y Continuar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

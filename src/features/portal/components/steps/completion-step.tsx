"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home } from "lucide-react";
import Link from "next/link";

export function CompletionStep() {
  return (
    <div className="space-y-6 text-center">
      <Card className="border-green-100 bg-green-50/50">
        <CardContent className="pt-10 pb-10 flex flex-col items-center space-y-4">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-green-900">¡Expediente Completado!</h2>
            <p className="text-green-800 max-w-md mx-auto">
              Hemos recibido todos tus documentos exitosamente. El equipo legal procederá a revisar tu caso.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p className="mb-4">Te notificaremos por correo electrónico cualquier actualización.</p>
        <p>Puedes cerrar esta ventana o volver al inicio.</p>
      </div>
    </div>
  );
}

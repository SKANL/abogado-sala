"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
            <div className="p-4 bg-destructive/10 rounded-full">
                <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
        </div>
        
        <div className="space-y-2">
            <h2 className="text-2xl font-bold">Ha ocurrido un error</h2>
            <p className="text-muted-foreground">
                No pudimos completar tu solicitud. Intenta recargar la página.
            </p>
        </div>

        <div className="p-4 border rounded-lg bg-muted/50 text-left">
            <code className="text-xs font-mono text-destructive break-all">
                {error.message || "Error desconocido"}
            </code>
        </div>

        <div className="flex justify-center gap-4">
            <Button onClick={() => window.location.reload()} variant="outline">
                Recargar Página
            </Button>
            <Button onClick={() => reset()}>
                Reintentar Acción
            </Button>
        </div>
      </div>
    </div>
  );
}

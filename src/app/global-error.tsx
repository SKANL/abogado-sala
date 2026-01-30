"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service (later)
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-bold tracking-tight">500</h2>
            <h3 className="text-xl font-semibold">Algo salió muy mal</h3>
            <p className="text-muted-foreground max-w-md">
              Ocurrió un error crítico en la aplicación. Hemos notificado al equipo técnico.
            </p>
          </div>
          <Button onClick={() => reset()} variant="default">
            Intentar de nuevo
          </Button>
        </div>
      </body>
    </html>
  );
}

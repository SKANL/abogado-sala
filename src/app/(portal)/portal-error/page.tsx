import { AlertCircle, LockKeyhole } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function PortalErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const isExpired = reason === "expired";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-amber-500">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-amber-100 p-3 rounded-full w-fit mb-4 text-amber-600">
            {isExpired ? <LockKeyhole className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
          </div>
          <CardTitle className="text-2xl font-bold">Acceso Denegado</CardTitle>
          <CardDescription>
            {isExpired
              ? "Este enlace ha expirado por motivos de seguridad."
              : "No se pudo encontrar el expediente solicitado."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Alert className="bg-amber-50 text-amber-800 border-amber-200">
            <AlertCircle className="h-4 w-4" color="#d97706" />
            <AlertTitle className="text-amber-800">¿Qué sucedió?</AlertTitle>
            <AlertDescription className="text-amber-700 mt-1">
              Los enlaces del portal de clientes son de un solo uso o tienen una fecha de caducidad
              para proteger la privacidad de su información legal. 
              {isExpired ? " El tiempo límite de este enlace ha expirado." : " Es posible que el expediente haya sido cerrado o eliminado por su abogado."}
            </AlertDescription>
          </Alert>
          
          <div className="text-center pt-2">
            <p className="text-sm text-muted-foreground mb-4">
              Por favor, contacte a su abogado para solicitar un nuevo enlace de acceso.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

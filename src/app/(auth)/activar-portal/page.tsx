import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivationContent } from "@/features/portal/components/activation-content";
import { Shield } from "lucide-react";

export default function ActivatePortalPage() {
  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Activa tu portal de cliente</CardTitle>
        <CardDescription>
          Bienvenido. Este es tu espacio personal para seguir el estado de tu expediente
          y subir documentos de forma segura.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ActivationContent />
      </CardContent>
    </Card>
  );
}

import { AlertCircle, LockKeyhole, Archive, SearchX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Reason = "expired" | "archived" | "not_found" | string;

interface ReasonConfig {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  alertTitle: string;
  alertBody: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  alertBg: string;
  alertBorder: string;
  alertText: string;
}

function getReasonConfig(reason: Reason): ReasonConfig {
  switch (reason) {
    case "expired":
      return {
        icon: <LockKeyhole className="h-8 w-8" />,
        title: "Enlace Expirado",
        subtitle: "Este enlace ha expirado por motivos de seguridad.",
        alertTitle: "¿Qué sucedió?",
        alertBody:
          "Los enlaces del portal de clientes tienen una fecha de caducidad para proteger la privacidad de su información. El tiempo límite de este enlace ha sido superado.",
        borderColor: "border-t-amber-500",
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        alertBg: "bg-amber-50",
        alertBorder: "border-amber-200",
        alertText: "text-amber-700",
      };
    case "archived":
      return {
        icon: <Archive className="h-8 w-8" />,
        title: "Expediente Archivado",
        subtitle: "Este expediente ha sido archivado y ya no está disponible.",
        alertTitle: "Expediente cerrado",
        alertBody:
          "El expediente asociado a este enlace ha sido archivado por el despacho. Si crees que esto es un error, contacta directamente a tu abogado.",
        borderColor: "border-t-slate-400",
        iconBg: "bg-slate-100",
        iconColor: "text-slate-600",
        alertBg: "bg-slate-50",
        alertBorder: "border-slate-200",
        alertText: "text-slate-700",
      };
    case "not_found":
      return {
        icon: <SearchX className="h-8 w-8" />,
        title: "Enlace No Válido",
        subtitle: "No se encontró un expediente asociado a este enlace.",
        alertTitle: "Enlace no reconocido",
        alertBody:
          "El enlace que usaste no corresponde a ningún expediente en nuestro sistema. Puede que haya sido eliminado o que el enlace esté incompleto. Solicita uno nuevo a tu abogado.",
        borderColor: "border-t-red-400",
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        alertBg: "bg-red-50",
        alertBorder: "border-red-200",
        alertText: "text-red-700",
      };
    default:
      return {
        icon: <AlertCircle className="h-8 w-8" />,
        title: "Acceso Denegado",
        subtitle: "No se pudo acceder al expediente solicitado.",
        alertTitle: "¿Qué sucedió?",
        alertBody:
          "Es posible que el expediente haya sido cerrado, movido o que el enlace sea incorrecto. Contacta a tu abogado para obtener asistencia.",
        borderColor: "border-t-amber-500",
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        alertBg: "bg-amber-50",
        alertBorder: "border-amber-200",
        alertText: "text-amber-700",
      };
  }
}

export default async function PortalErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason = "default" } = await searchParams;
  const cfg = getReasonConfig(reason);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md shadow-lg border-t-4 ${cfg.borderColor}`}>
        <CardHeader className="text-center pb-2">
          <div className={`mx-auto ${cfg.iconBg} p-3 rounded-full w-fit mb-4 ${cfg.iconColor}`}>
            {cfg.icon}
          </div>
          <CardTitle className="text-2xl font-bold">{cfg.title}</CardTitle>
          <CardDescription>{cfg.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Alert className={`${cfg.alertBg} border ${cfg.alertBorder}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className={cfg.alertText}>{cfg.alertTitle}</AlertTitle>
            <AlertDescription className={`${cfg.alertText} mt-1`}>
              {cfg.alertBody}
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground text-center pt-2">
            Por favor, contacte a su abogado para solicitar un nuevo enlace de acceso.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, UserPlus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function CompletionStep() {
  const [isAuthenticated, setIsAuthenticated] = useState(true); // pessimistic default (no flash)

  useEffect(() => {
    // Lazy-import canvas-confetti to keep bundle lean
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"],
      });
    });

    // Check if the user already has a client portal account
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const role = session?.user?.app_metadata?.role;
      setIsAuthenticated(role === "client");
    });
  }, []);

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

      {/* Account CTA — only for anonymous portal users */}
      {!isAuthenticated && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 pb-6 flex flex-col items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1 text-center">
              <p className="font-semibold text-sm">¿Quieres acceder sin enlace?</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Si tu despacho te ha enviado una invitación por email, puedes crear tu cuenta
                y revisar el estado de tu caso en cualquier momento.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link href="/mi-portal/login">
                Ir a mi portal <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-muted-foreground">
        <p className="mb-4">Te notificaremos por correo electrónico cualquier actualización.</p>
        <p>Puedes cerrar esta ventana o volver al inicio.</p>
      </div>
    </div>
  );
}

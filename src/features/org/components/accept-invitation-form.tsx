"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction } from "@/features/org/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Result } from "@/types";
import { CheckCircle2, Building2 } from "lucide-react";
import { FormFieldError } from "@/components/ui/form-field-error";

const initialState: Result<any> = { success: false, error: "" };

interface AcceptInvitationFormProps {
  token: string;
  email: string;
  orgName: string;
  role: string;
}

export function AcceptInvitationForm({
  token,
  email,
  orgName,
  role,
}: AcceptInvitationFormProps) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(
    acceptInvitationAction,
    initialState
  );

  useEffect(() => {
    if (state.success && state.data && !state.data.requiresEmailConfirm) {
      // If no email confirmation required, go directly to dashboard after short delay
      const t = setTimeout(() => router.push("/dashboard"), 1500);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  const roleLabel = role === "admin" ? "Administrador" : "Miembro";

  // Success state
  if (state.success) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">¡Cuenta creada!</h2>
            {state.data?.requiresEmailConfirm ? (
              <p className="text-sm text-muted-foreground mt-1">
                Revisa tu correo <strong>{email}</strong> para confirmar tu
                cuenta y luego inicia sesión.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Bienvenido a <strong>{orgName}</strong>. Redirigiendo al
                dashboard…
              </p>
            )}
          </div>
          {state.data?.requiresEmailConfirm && (
            <Button variant="outline" onClick={() => router.push("/login")}>
              Ir a Iniciar Sesión
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Building2 className="h-5 w-5" />
          <span className="text-sm font-medium">{orgName}</span>
        </div>
        <CardTitle>Aceptar Invitación</CardTitle>
        <CardDescription>
          Has sido invitado como <strong>{roleLabel}</strong>. Crea tu cuenta
          para acceder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {/* Hidden token — server action verifies this */}
          <input type="hidden" name="token" value={token} />

          <div className="space-y-2">
            <Label htmlFor="email_display">Correo Electrónico</Label>
            <Input
              id="email_display"
              value={email}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="Tu nombre completo"
              required
              disabled={isPending}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isPending}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmar Contraseña</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isPending}
              autoComplete="new-password"
            />
          </div>

          <FormFieldError message={!state.success ? state.error : null} />

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creando cuenta…" : "Crear Cuenta y Unirse"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { Result } from "@/types";

const initialState: Result<void> = { success: false, error: "" };

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState(
    forgotPasswordAction,
    initialState
  );

  if (state.success) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>¡Revisa tu correo!</CardTitle>
          <CardDescription>
            Si existe una cuenta con ese email, recibirás un enlace para
            restablecer tu contraseña en los próximos minutos.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3">
          <p className="text-xs text-center text-muted-foreground">
            ¿No recibiste el correo? Revisa tu carpeta de spam.
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">Volver al inicio de sesión</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Recuperar contraseña</CardTitle>
        <CardDescription>
          Ingresa tu email y te enviaremos un enlace para restablecer tu
          contraseña.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
                disabled={isPending}
                className="pl-9"
              />
            </div>
          </div>
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enviando..." : "Enviar instrucciones"}
          </Button>
          <div className="text-sm text-muted-foreground text-center">
            <Link href="/login" className="text-primary hover:underline">
              ← Volver al inicio de sesión
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

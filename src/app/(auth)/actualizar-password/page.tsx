"use client";

import { useActionState, useEffect } from "react";
import { updatePasswordAction } from "@/features/auth/actions";
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
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Result } from "@/types";
import { useRouter } from "next/navigation";

const initialState: Result<void> = { success: false, error: "" };

export default function UpdatePasswordPage() {
  const [state, action, isPending] = useActionState(
    updatePasswordAction,
    initialState
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => router.push("/dashboard"), 2500);
      return () => clearTimeout(timer);
    }
  }, [state.success, router]);

  if (state.success) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-green-700">¡Contraseña actualizada!</CardTitle>
          <CardDescription>
            Tu contraseña ha sido cambiada exitosamente. Serás redirigido al
            dashboard en unos segundos...
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" asChild>
            <Link href="/dashboard">Ir al dashboard ahora</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Nueva contraseña</CardTitle>
        <CardDescription>
          Elige una contraseña segura para tu cuenta.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              disabled={isPending}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmar contraseña</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={6}
              disabled={isPending}
              placeholder="Repite tu contraseña"
            />
          </div>
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Actualizando..." : "Actualizar contraseña"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { signupWithOrgAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Result } from "@/types";
import { useRouter } from "next/navigation";
import { FormFieldError } from "@/components/ui/form-field-error";

const initialState: Result<void> = { success: false, error: "" };

export default function RegisterPage() {
  const [state, action, isPending] = useActionState(signupWithOrgAction, initialState);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value ?? "";
    const confirm = (form.elements.namedItem("confirm_password") as HTMLInputElement)?.value ?? "";
    if (password !== confirm) {
      e.preventDefault();
      setConfirmError("Las contraseñas no coinciden");
    } else {
      setConfirmError(null);
    }
  };

  // Try to redirect to dashboard on success - if email confirmation is off, user is already logged in.
  // If confirmation is required, middleware will redirect them to login.
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => router.push("/dashboard"), 1500);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);

  if (state?.success) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-green-700">¡Bienvenido a AbogadoSala!</CardTitle>
          <CardDescription>
            Tu cuenta y despacho han sido creados exitosamente. Redirigiendo al dashboard...
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={() => router.push("/dashboard")}>
            Ir al Dashboard ahora
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Crear Cuenta</CardTitle>
        <CardDescription>
          Prueba Abogado Sala gratis por 14 días. No se requiere tarjeta de crédito.
        </CardDescription>
      </CardHeader>
      <form action={action} onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="Juan Pérez"
              required
              disabled={isPending}
            />
            <FormFieldError message={state?.validationErrors?.full_name?.[0]} />
          </div>
          
           <div className="space-y-2">
            <Label htmlFor="org_name">Nombre del Despacho / Organización</Label>
            <Input
              id="org_name"
              name="org_name"
              placeholder="Estudio Jurídico Pérez"
              required
              disabled={isPending}
            />
            <FormFieldError message={state?.validationErrors?.org_name?.[0]} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              required
              disabled={isPending}
            />
            <FormFieldError message={state?.validationErrors?.email?.[0]} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              disabled={isPending}
            />
            <FormFieldError message={state?.validationErrors?.password?.[0]} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmar Contraseña</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={6}
              disabled={isPending}
              placeholder="Repite tu contraseña"
            />
            <FormFieldError message={confirmError} />
          </div>
          
          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creando cuenta..." : "Comenzar Prueba Gratis"}
          </Button>
          <div className="text-sm text-muted-foreground text-center">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Inicia sesión aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

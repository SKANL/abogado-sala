"use client";

import { useActionState } from "react";
import { loginAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Result } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useSearchParams } from "next/navigation";

const initialState: Result<void> = { success: false, error: "" };

const PARAM_ERROR_MESSAGES: Record<string, string> = {
  "invitacion-invalida": "El enlace de invitación es inválido o ya fue utilizado. Pide al administrador que genere uno nuevo.",
  "sesion-expirada":      "Tu sesión ha expirado. Por favor inicia sesión de nuevo.",
};

/** Reads ?error= from the URL. Must be isolated in Suspense because useSearchParams()
 *  opts the page out of static rendering. */
function ParamError({ hasActionError }: { hasActionError: boolean }) {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const paramErrorMessage = errorParam
    ? (PARAM_ERROR_MESSAGES[errorParam] ?? "Ha ocurrido un error. Intenta de nuevo.")
    : null;

  if (!paramErrorMessage || hasActionError) return null;

  return (
    <div className="p-3 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
      {paramErrorMessage}
    </div>
  );
}

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.push("/dashboard");
    }
  }, [state.success, router]);

  const hasActionError = !state.success && !!state.error;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Iniciar Sesión</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para acceder a la plataforma.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
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
            <FormFieldError message={!state.success ? state.validationErrors?.email?.[0] : null} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link
                href="/recuperar-password"
                className="text-xs text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={isPending}
            />
            <FormFieldError message={!state.success ? state.validationErrors?.password?.[0] : null} />
          </div>
          {hasActionError && (
            <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md">
              {state.error}
            </div>
          )}
          <Suspense>
            <ParamError hasActionError={hasActionError} />
          </Suspense>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ingresando..." : "Ingresar"}
          </Button>
          <div className="text-sm text-muted-foreground text-center">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="text-primary hover:underline">
              Regístrate aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

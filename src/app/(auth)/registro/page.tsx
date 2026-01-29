"use client";

import { useActionState } from "react";
import { signupWithOrgAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Result } from "@/types";

const initialState: Result<void> = { success: false, error: "" };

export default function RegisterPage() {
  const [state, action, isPending] = useActionState(signupWithOrgAction, initialState);

  // Success state handling: ideally backend redirects or we show a check email screen.
  // The action currently returns success=true if okay.
  if (state?.success) {
      return (
          <Card className="w-full">
              <CardHeader>
                  <CardTitle className="text-green-600">¡Registro Exitoso!</CardTitle>
                  <CardDescription>
                      Bienvenido a Abogado Sala.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-foreground">
                    Tu cuenta y organización han sido creadas.
                    {/* Assuming email confirmation is OFF for trial, or we prompt for it */}
                    Por favor inicia sesión para continuar.
                  </p>
              </CardContent>
              <CardFooter>
                  <Button asChild className="w-full">
                      <Link href="/login">Ir a Iniciar Sesión</Link>
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
      <form action={action}>
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
            {state?.validationErrors?.full_name && (
              <p className="text-sm text-destructive">{state.validationErrors.full_name[0]}</p>
            )}
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
            {state?.validationErrors?.org_name && (
              <p className="text-sm text-destructive">{state.validationErrors.org_name[0]}</p>
            )}
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
            {state?.validationErrors?.email && (
              <p className="text-sm text-destructive">{state.validationErrors.email[0]}</p>
            )}
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
             {state?.validationErrors?.password && (
              <p className="text-sm text-destructive">{state.validationErrors.password[0]}</p>
            )}
          </div>
          
          {state?.error && (
            <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md">
              {state.error}
            </div>
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

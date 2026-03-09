"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, Mail, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { activateClientAccountAction } from "@/features/portal/actions/client-portal";
import { createClient } from "@/lib/supabase/client";

type Phase = "loading" | "set-password" | "success" | "error";

export function ActivationContent() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("set-password");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleActivate = (withPassword: boolean) => {
    if (withPassword && password !== confirm) {
      setErrorMsg("Las contraseñas no coinciden");
      return;
    }

    startTransition(async () => {
      setPhase("loading");
      let passwordSet = false;

      // Optionally set a password
      if (withPassword && password.length >= 8) {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          setErrorMsg(error.message);
          setPhase("set-password");
          return;
        }
        passwordSet = true;
      }

      // Link the account
      const result = await activateClientAccountAction();
      if (!result.success) {
        setErrorMsg(result.error ?? "Error activando la cuenta");
        setPhase("error");
        return;
      }

      toast.success("¡Portal activado!", {
        description: passwordSet
          ? "Tu cuenta ha sido creada con contraseña."
          : "Puedes iniciar sesión con un enlace mágico.",
      });
      setPhase("success");
      setTimeout(() => router.push("/mi-portal"), 1800);
    });
  };

  if (phase === "success") {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">¡Cuenta activada!</h2>
        <p className="text-muted-foreground text-sm">Redirigiendo a tu portal…</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorMsg}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border text-sm">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            Puedes iniciar sesión con un <strong>enlace mágico</strong> enviado a tu correo,
            o crear ahora una contraseña para acceso inmediato.
          </span>
        </div>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" />
              Contraseña (opcional)
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              disabled={isPending || phase === "loading"}
              minLength={8}
            />
          </div>
          {password.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                disabled={isPending || phase === "loading"}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {password.length >= 8 ? (
          <Button
            onClick={() => handleActivate(true)}
            disabled={isPending || phase === "loading" || password !== confirm}
            className="w-full"
          >
            {isPending || phase === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Activar portal con contraseña
          </Button>
        ) : null}
        <Button
          variant={password.length >= 8 ? "outline" : "default"}
          onClick={() => handleActivate(false)}
          disabled={isPending || phase === "loading"}
          className="w-full"
        >
          {isPending || phase === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Activar sin contraseña (usar enlace mágico)
        </Button>
      </div>
    </div>
  );
}

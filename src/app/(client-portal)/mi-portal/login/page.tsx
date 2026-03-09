"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendClientMagicLinkAction } from "@/features/portal/actions/client-portal";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, Mail, Lock, EyeOff, Eye, Shield } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type Mode = "magic-link" | "password";

export default function ClientPortalLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("magic-link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleMagicLink = () => {
    if (!email.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await sendClientMagicLinkAction(email);
      if (result.success) {
        setMagicSent(true);
      } else {
        setError(result.error ?? "Error enviando el enlace");
      }
    });
  };

  const handlePasswordLogin = () => {
    if (!email.trim() || !password) return;
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        setError("Email o contraseña incorrectos");
        return;
      }
      const role = data.user?.app_metadata?.role;
      if (role !== "client") {
        await supabase.auth.signOut();
        setError("Esta cuenta no es un portal de cliente. Accede en /login.");
        return;
      }
      toast.success("Sesión iniciada");
      router.push("/mi-portal");
      router.refresh();
    });
  };

  if (magicSent) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <CardTitle>¡Revisa tu correo!</CardTitle>
            <CardDescription>
              Te hemos enviado un enlace de acceso a <strong>{email}</strong>.
              Haz clic en el enlace del correo para entrar a tu portal.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => setMagicSent(false)}>
              Usar otro email
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Portal de Cliente</CardTitle>
          <CardDescription>Accede a tu expediente y documentos.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              disabled={isPending}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  mode === "magic-link" ? handleMagicLink() : undefined;
                }
              }}
            />
          </div>

          {mode === "password" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  disabled={isPending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePasswordLogin();
                  }}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          {mode === "magic-link" ? (
            <>
              <Button
                className="w-full gap-1.5"
                onClick={handleMagicLink}
                disabled={isPending || !email.trim()}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Enviar enlace de acceso
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setMode("password")}
                disabled={isPending}
              >
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                Tengo contraseña
              </Button>
            </>
          ) : (
            <>
              <Button
                className="w-full"
                onClick={handlePasswordLogin}
                disabled={isPending || !email.trim() || !password}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Iniciar sesión
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setMode("magic-link")}
                disabled={isPending}
              >
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Prefiero recibir un enlace
              </Button>
            </>
          )}
          <p className="text-xs text-center text-muted-foreground pt-1">
            ¿Tienes un enlace de expediente?{" "}
            <Link href="/sala" className="underline hover:text-foreground">
              Accede por aquí
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

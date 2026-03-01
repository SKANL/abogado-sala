"use client";

import { useActionState, useEffect } from "react";
import { updateProfileAction, updatePasswordAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Result } from "@/types";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FormFieldError } from "@/components/ui/form-field-error";
import { ImageUploader } from "@/components/common/image-uploader";

interface Props {
  userId: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
}

const initialState: Result<unknown> = { success: false, error: "" };

export function ProfileForm({ userId, fullName, email, avatarUrl }: Props) {
  const [state, action, isPending] = useActionState(updateProfileAction, initialState);
  const [pwState, pwAction, isPwPending] = useActionState(updatePasswordAction, initialState);

  useEffect(() => {
    if (state.success) toast.success("Perfil actualizado correctamente");
    else if (state.error) toast.error(state.error);
  }, [state]);

  useEffect(() => {
    if (pwState.success) toast.success("Contraseña actualizada correctamente");
    else if (pwState.error) toast.error(pwState.error);
  }, [pwState]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>Esta información será visible para tu equipo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback>{fullName?.charAt(0) ?? "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Foto de Perfil</p>
              <p className="text-xs text-muted-foreground">JPG o PNG, máximo 5MB.</p>
            </div>
          </div>

          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={fullName ?? ""}
                disabled={isPending}
              />
              {!state.success && state.validationErrors?.full_name && (
                <FormFieldError message={state.validationErrors.full_name[0]} />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue={email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">El email no se puede cambiar.</p>
            </div>

            <div className="space-y-2">
              <Label>Foto de Perfil</Label>
              <input
                type="hidden"
                name="avatar_url"
                id="hidden-avatar-url"
                defaultValue={avatarUrl ?? ""}
              />
              <ImageUploader
                bucket="user-avatars"
                folderPath={userId}
                defaultUrl={avatarUrl}
                aspectRatio="square"
                className="max-w-40"
                onUploadComplete={(url) => {
                  const input = document.getElementById("hidden-avatar-url") as HTMLInputElement;
                  if (input) input.value = url;
                }}
                onRemove={() => {
                  const input = document.getElementById("hidden-avatar-url") as HTMLInputElement;
                  if (input) input.value = "";
                }}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
          <CardDescription>Elige una contraseña segura de al menos 6 caracteres.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={pwAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                disabled={isPwPending}
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
                disabled={isPwPending}
                autoComplete="new-password"
              />
              {!pwState.success && pwState.error && (
                <FormFieldError message={pwState.error} />
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" variant="outline" disabled={isPwPending}>
                {isPwPending ? "Actualizando..." : "Actualizar Contraseña"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

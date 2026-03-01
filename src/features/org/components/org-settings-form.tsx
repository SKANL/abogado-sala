"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateOrganizationAction } from "@/features/org/actions";
import { ImageUploader } from "@/components/common/image-uploader";
import { FormFieldError } from "@/components/ui/form-field-error";
import { DeleteOrganizationDialog } from "@/features/org/components/delete-organization-dialog";
import { toast } from "sonner";
import { Result } from "@/types";

interface Props {
  orgId: string;
  orgName: string;
  primaryColor: string | null;
  logoUrl: string | null;
  isOwner: boolean;
}

const initialState: Result<any> = { success: false, error: "" };

export function OrgSettingsForm({ orgId, orgName, primaryColor, logoUrl, isOwner }: Props) {
  const [state, action, isPending] = useActionState(updateOrganizationAction, initialState);
  const [color, setColor] = useState<string>(primaryColor || "#18181b");

  useEffect(() => {
    if (state.success) {
      toast.success("Organización actualizada correctamente");
    } else if (!state.success && state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Marca e Identidad</CardTitle>
          <CardDescription>
            Personaliza cómo ven tus clientes el portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Despacho</Label>
              <Input
                id="name"
                name="name"
                defaultValue={orgName}
                disabled={isPending}
              />
              {!state.success && state.validationErrors?.name && (
                <FormFieldError message={state.validationErrors.name[0]} />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_color_picker">Color Primario (Hex)</Label>
              <div className="flex gap-2">
                <input
                  id="primary_color_picker"
                  type="color"
                  className="w-12 h-10 p-1 cursor-pointer rounded-md border border-input"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={isPending}
                />
                <Input
                  value={color}
                  onChange={(e) => {
                    const v = e.target.value;
                    setColor(v);
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) setColor(v);
                  }}
                  placeholder="#18181b"
                  disabled={isPending}
                  className="flex-1 font-mono"
                />
              </div>
              <input type="hidden" name="primary_color" value={color} />
              {!state.success && state.validationErrors?.primary_color && (
                <FormFieldError message={state.validationErrors.primary_color[0]} />
              )}
            </div>

            <div className="space-y-4">
              <Label>Logo del Despacho</Label>
              <input
                type="hidden"
                name="logo_url"
                defaultValue={logoUrl || ""}
                id="hidden-logo-url"
              />
              <ImageUploader
                bucket="organization-assets"
                folderPath={orgId}
                defaultUrl={logoUrl}
                className="w-full"
                aspectRatio="auto"
                onUploadComplete={(url) => {
                  const input = document.getElementById("hidden-logo-url") as HTMLInputElement;
                  if (input) input.value = url;
                }}
                onRemove={() => {
                  const input = document.getElementById("hidden-logo-url") as HTMLInputElement;
                  if (input) input.value = "";
                }}
              />
              {!state.success && state.validationErrors?.logo_url && (
                <FormFieldError message={state.validationErrors.logo_url[0]} />
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Danger Zone ──────────────────────────────────────────── */}
      {isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
            <CardDescription>
              Las acciones de esta sección son permanentes e irreversibles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="font-medium text-sm">Eliminar organización</p>
                <p className="text-sm text-muted-foreground">
                  Borra permanentemente <strong>{orgName}</strong> y todos sus datos:
                  casos, clientes, archivos y cuentas de equipo.
                </p>
              </div>
              <div className="shrink-0">
                <DeleteOrganizationDialog orgName={orgName} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

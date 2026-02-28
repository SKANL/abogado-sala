"use client";

import { useActionState, useEffect, useState } from "react";
import { updateOrganizationAction } from "@/features/org/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Result } from "@/types";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { ImageUploader } from "@/components/common/image-uploader";
import { FormFieldError } from "@/components/ui/form-field-error";

const initialState: Result<any> = { success: false, error: "" };

export default function SettingsPage() {
    const { org, loading } = useAuth();
    const [state, action, isPending] = useActionState(updateOrganizationAction, initialState);
    const [color, setColor] = useState<string>(org?.primary_color || "#18181b");

    // Sync color when org loads (async from provider)
    useEffect(() => {
        if (org?.primary_color) setColor(org.primary_color);
    }, [org?.primary_color]);

    useEffect(() => {
        if (state.success) {
            toast.success("Organización actualizada correctamente");
        } else if (state.error) {
            toast.error(state.error);
        }
    }, [state]);

    // Initial Loading State
    if (loading || !org) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-medium">Ajustes de Organización</h3>
                <p className="text-sm text-muted-foreground">
                    Gestiona la marca y configuración de {org?.name}.
                </p>
            </div>
            
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
                                defaultValue={org.name} 
                                key={org.name} // Force update if name changes
                                disabled={isPending} 
                            />
                            {!state.success && state.validationErrors?.name && (
                                <FormFieldError message={state.validationErrors.name[0]} />
                            )}
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="primary_color_picker">Color Primario (Hex)</Label>
                            <div className="flex gap-2">
                                {/* Color swatch picker */}
                                <input
                                    id="primary_color_picker"
                                    type="color"
                                    className="w-12 h-10 p-1 cursor-pointer rounded-md border border-input"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    disabled={isPending}
                                />
                                {/* Text input for manual hex entry */}
                                <Input
                                    value={color}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setColor(v);
                                        // Sync picker only when value is a valid full hex
                                        if (/^#[0-9a-fA-F]{6}$/.test(v)) setColor(v);
                                    }}
                                    placeholder="#18181b"
                                    disabled={isPending}
                                    className="flex-1 font-mono"
                                />
                            </div>
                            {/* Hidden input carries the final value to the server action */}
                            <input type="hidden" name="primary_color" value={color} />
                            {!state.success && state.validationErrors?.primary_color && (
                                <FormFieldError message={state.validationErrors.primary_color[0]} />
                            )}
                        </div>

                        <div className="space-y-4">
                            <Label>Logo del Despacho</Label>
                            
                            {/* Hidden Input for Form Submission */}
                            <input type="hidden" name="logo_url" defaultValue={org?.logo_url || ""} id="hidden-logo-url" />
                            
                            <ImageUploader 
                                bucket="organization-assets" 
                                folderPath={org?.id}
                                defaultUrl={org?.logo_url}
                                className="w-full"
                                aspectRatio="auto"
                                onUploadComplete={(url) => {
                                    const input = document.getElementById("hidden-logo-url") as HTMLInputElement;
                                    if(input) input.value = url;
                                }}
                                onRemove={() => {
                                    const input = document.getElementById("hidden-logo-url") as HTMLInputElement;
                                    if(input) input.value = "";
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
        </div>
    );
}

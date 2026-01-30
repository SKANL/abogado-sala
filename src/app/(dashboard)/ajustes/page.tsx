"use client";

import { useActionState, useEffect } from "react";
import { updateOrganizationAction } from "@/features/org/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Result } from "@/types";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { ImageUploader } from "@/components/common/image-uploader";

const initialState: Result<any> = { success: false, error: "" };

export default function SettingsPage() {
    const { org, loading } = useAuth(); // Correct property name is 'loading'
    const [state, action, isPending] = useActionState(updateOrganizationAction, initialState);

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
        <div className="space-y-6">
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
                                <p className="text-sm text-destructive">{state.validationErrors.name[0]}</p>
                            )}
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="primary_color">Color Primario (Hex)</Label>
                            <div className="flex gap-2">
                                <Input 
                                    id="primary_color" 
                                    name="primary_color" 
                                    type="color"
                                    className="w-12 h-10 p-1 cursor-pointer"
                                    defaultValue={org?.primary_color || "#18181b"}
                                    disabled={isPending} 
                                />
                                <Input 
                                    name="primary_color_text" 
                                    defaultValue={org?.primary_color || "#18181b"}
                                    disabled
                                    className="flex-1"
                                />
                            </div>
                             {!state.success && state.validationErrors?.primary_color && (
                                <p className="text-sm text-destructive">{state.validationErrors.primary_color[0]}</p>
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
                                <p className="text-sm text-destructive">{state.validationErrors.logo_url[0]}</p>
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

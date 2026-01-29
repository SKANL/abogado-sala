"use client";

import { useActionState, useEffect } from "react";
import { updateProfileAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Result } from "@/types";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const initialState: Result<any> = { success: false, error: "" };

export default function ProfilePage() {
    const { user } = useAuth();
    const [state, action, isPending] = useActionState(updateProfileAction, initialState);

    useEffect(() => {
        if (state.success) {
            toast.success("Perfil actualizado correctamente");
        } else if (state.error) {
            toast.error(state.error);
        }
    }, [state]);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Mi Perfil</h3>
                <p className="text-sm text-muted-foreground">
                    Información personal y de contacto.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Información Personal</CardTitle>
                    <CardDescription>
                        Esta información será visible para tu equipo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="mb-6 flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user?.user_metadata?.avatar_url} />
                            <AvatarFallback>
                                {user?.user_metadata?.full_name?.charAt(0) || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-medium">Foto de Perfil</p>
                            <p className="text-xs text-muted-foreground">Gestionada vía URL por ahora.</p>
                        </div>
                    </div>

                    <form action={action} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nombre Completo</Label>
                            <Input 
                                id="full_name" 
                                name="full_name" 
                                defaultValue={user?.user_metadata?.full_name} 
                                disabled={isPending} 
                            />
                             {!state.success && state.validationErrors?.full_name && (
                                <p className="text-sm text-destructive">{state.validationErrors.full_name[0]}</p>
                            )}
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                                id="email" 
                                defaultValue={user?.email} 
                                disabled 
                                className="bg-muted"
                            />
                             <p className="text-xs text-muted-foreground">El email no se puede cambiar.</p>
                        </div>
                        
                         <div className="space-y-2">
                            <Label htmlFor="avatar_url">URL Avatar</Label>
                            <Input 
                                id="avatar_url" 
                                name="avatar_url" 
                                defaultValue={user?.user_metadata?.avatar_url || ""} 
                                placeholder="https://..."
                                disabled={isPending} 
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
        </div>
    );
}

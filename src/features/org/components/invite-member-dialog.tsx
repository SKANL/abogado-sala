"use client";

import { useActionState, useEffect, useState } from "react";
import { inviteMemberAction } from "@/features/org/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Result } from "@/types";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Plus, CheckCircle2 } from "lucide-react";
import { FormFieldError } from "@/components/ui/form-field-error";
import { CopyableField } from "@/components/ui/copyable-field";

const initialState: Result<any> = { success: false, error: "" };

export function InviteMemberDialog() {
    const [open, setOpen] = useState(false);
    const [invitationLink, setInvitationLink] = useState<string | null>(null);
    const [state, action, isPending] = useActionState(inviteMemberAction, initialState);
    
    useEffect(() => {
        if (state.success && state.data) {
            toast.success("Invitación creada");
            // Build the invitation link from the token
            const token = state.data.token;
            if (token) {
                const link = `${window.location.origin}/invitacion/${token}`;
                setInvitationLink(link);
            } else {
                setOpen(false);
            }
        } else if (!state.success && state.error) {
            toast.error(state.error);
        }
    }, [state]);

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            setInvitationLink(null); // Reset on close
        }
    };

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={handleOpenChange}
            title={invitationLink ? "¡Invitación Creada!" : "Invitar al Equipo"}
            description={invitationLink 
                ? "Comparte este enlace con el nuevo miembro para que se una a tu equipo."
                : "Envía una invitación a un nuevo miembro."
            }
            trigger={
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Invitar Miembro
                </Button>
            }
        >
            {invitationLink ? (
                <div className="space-y-4 py-4">
                    <div className="flex justify-center">
                        <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 p-3">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                        Envía este enlace al invitado. El enlace expira en <strong>7 días</strong>.
                    </p>
                    <CopyableField 
                        value={invitationLink} 
                        label="Enlace"
                        tooltip="Copiar enlace de invitación"
                    />
                    <div className="flex justify-end pt-2">
                        <Button variant="outline" onClick={() => handleOpenChange(false)}>
                            Cerrar
                        </Button>
                    </div>
                </div>
            ) : (
                <form action={action}>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="colaborador@despacho.com"
                                required
                                disabled={isPending}
                            />
                            <FormFieldError message={!state.success ? state.validationErrors?.email?.[0] : null} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Rol</Label>
                            <Select name="role" defaultValue="member" disabled={isPending}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">Miembro</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isPending}>
                             {isPending ? "Enviando..." : "Crear Invitación"}
                        </Button>
                    </div>
                </form>
            )}
        </ResponsiveDialog>
    );
}

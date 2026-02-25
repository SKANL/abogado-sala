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
import { Plus } from "lucide-react";

const initialState: Result<any> = { success: false, error: "" };

export function InviteMemberDialog() {
    const [open, setOpen] = useState(false);
    const [state, action, isPending] = useActionState(inviteMemberAction, initialState);
    
    useEffect(() => {
        if (state.success) {
            toast.success("Invitación creada");
            setOpen(false); // Auto-close on success
        } else if (state.error) {
            toast.error(state.error);
        }
    }, [state]);

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={setOpen}
            title="Invitar al Equipo"
            description="Envía una invitación por correo a un nuevo miembro."
            trigger={
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Invitar Miembro
                </Button>
            }
        >
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
                         {!state.success && state.validationErrors?.email && (
                            <p className="text-sm text-destructive">{state.validationErrors.email[0]}</p>
                        )}
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
                         {isPending ? "Enviando..." : "Enviar Invitación"}
                    </Button>
                </div>
            </form>
        </ResponsiveDialog>
    );
}

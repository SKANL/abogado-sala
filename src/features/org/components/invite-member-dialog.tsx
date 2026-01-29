"use client";

import { useActionState, useEffect } from "react";
import { inviteMemberAction } from "@/features/org/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Result } from "@/types";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

const initialState: Result<any> = { success: false, error: "" };

export function InviteMemberDialog() {
    const [state, action, isPending] = useActionState(inviteMemberAction, initialState);
    
    useEffect(() => {
        if (state.success) {
            toast.success("Invitación creada");
            // Ideally close dialog here, but simple ActionState doesn't control open state easily without more boilerplate.
            // For now, relies on user to close or we can add state control.
        } else if (state.error) {
            toast.error(state.error);
        }
    }, [state]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Invitar Miembro
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={action}>
                    <DialogHeader>
                        <DialogTitle>Invitar al Equipo</DialogTitle>
                        <DialogDescription>
                            Envía una invitación por correo a un nuevo miembro.
                        </DialogDescription>
                    </DialogHeader>
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
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                             {isPending ? "Enviando..." : "Enviar Invitación"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useActionState, useEffect } from "react";
import { createClientAction, updateClientAction } from "@/features/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Result } from "@/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: Result<any> = { success: false, error: "" };

interface ClientFormProps {
    initialData?: {
        id: string;
        full_name: string;
        email: string | null;
        phone: string | null;
        status: string;
    };
}

export function ClientForm({ initialData }: ClientFormProps) {
    const isEditing = !!initialData;
    const [state, action, isPending] = useActionState(isEditing ? updateClientAction : createClientAction, initialState);
    const router = useRouter();

    useEffect(() => {
        if (state.success) {
            toast.success(isEditing ? "Cliente actualizado" : "Cliente creado");
            if (!isEditing) router.push("/clientes");
            router.refresh();
        } else if (state.error) {
            toast.error(state.error);
        }
    }, [state, router, isEditing]);

    return (
        <form action={action} className="space-y-4">
            {isEditing && <input type="hidden" name="id" value={initialData.id} />}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre Completo</Label>
                    <Input
                        id="full_name"
                        name="full_name"
                        defaultValue={initialData?.full_name}
                        placeholder="Nombre cliente"
                        required
                        disabled={isPending}
                    />
                    {!state.success && state.validationErrors?.full_name && (
                        <p className="text-sm text-destructive">{state.validationErrors.full_name[0]}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email (Opcional)</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={initialData?.email || ""}
                        placeholder="cliente@email.com"
                        disabled={isPending}
                    />
                     {!state.success && state.validationErrors?.email && (
                        <p className="text-sm text-destructive">{state.validationErrors.email[0]}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono (Opcional)</Label>
                    <Input
                        id="phone"
                        name="phone"
                        defaultValue={initialData?.phone || ""}
                        placeholder="+52 555 555 5555"
                        disabled={isPending}
                    />
                     {!state.success && state.validationErrors?.phone && (
                        <p className="text-sm text-destructive">{state.validationErrors.phone[0]}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select name="status" defaultValue={initialData?.status || "prospect"} disabled={isPending}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="prospect">Prospecto</SelectItem>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="archived">Archivado</SelectItem>
                        </SelectContent>
                    </Select>
                     {!state.success && state.validationErrors?.status && (
                        <p className="text-sm text-destructive">{state.validationErrors.status[0]}</p>
                    )}
                </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Guardando..." : (isEditing ? "Actualizar Cliente" : "Guardar Cliente")}
                </Button>
            </div>
        </form>
    );
}

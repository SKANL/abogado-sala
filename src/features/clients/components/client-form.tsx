"use client";

import { useActionState } from "react";
import { createClientAction } from "@/features/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Result } from "@/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect } from "react";

const initialState: Result<any> = { success: false, error: "" };

export function ClientForm() {
    const [state, action, isPending] = useActionState(createClientAction, initialState);
    const router = useRouter();

    useEffect(() => {
        if (state.success) {
            toast.success("Cliente creado correctamente");
            router.push("/clientes");
            router.refresh();
        } else if (state.error) {
            toast.error(state.error);
        }
    }, [state, router]);

    return (
        <form action={action} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre Completo</Label>
                    <Input
                        id="full_name"
                        name="full_name"
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
                        placeholder="+52 555 555 5555"
                        disabled={isPending}
                    />
                     {!state.success && state.validationErrors?.phone && (
                        <p className="text-sm text-destructive">{state.validationErrors.phone[0]}</p>
                    )}
                </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Guardando..." : "Guardar Cliente"}
                </Button>
            </div>
        </form>
    );
}

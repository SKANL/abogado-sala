"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setMemberClientsVisibilityAction } from "@/features/org/actions";
import { toast } from "sonner";
import { UserSquare2 } from "lucide-react";

interface MemberClientsVisibilityCardProps {
  membersCanSeeAllClients: boolean;
  isOwnerAdmin: boolean;
}

export function MemberClientsVisibilityCard({ membersCanSeeAllClients, isOwnerAdmin }: MemberClientsVisibilityCardProps) {
  const [enabled, setEnabled] = useState(membersCanSeeAllClients);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    setEnabled(checked); // optimistic
    startTransition(async () => {
      const result = await setMemberClientsVisibilityAction(checked);
      if (result.success) {
        toast.success(checked ? "Miembros pueden ver todos los clientes" : "Miembros solo ven sus clientes asignados");
      } else {
        setEnabled(!checked); // revert on error
        toast.error(result.error);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserSquare2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Visibilidad de Clientes para Miembros</CardTitle>
        </div>
        <CardDescription>
          Controla qué clientes pueden ver los miembros del despacho.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="client-visibility" className="text-sm font-medium">
              Permitir ver todos los clientes
            </Label>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? "Los miembros pueden ver todos los clientes de la organización."
                : "Los miembros solo ven los clientes asignados a ellos."}
            </p>
          </div>
          <Switch
            id="client-visibility"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isPending || !isOwnerAdmin}
            aria-label="Permitir a miembros ver todos los clientes"
          />
        </div>
      </CardContent>
    </Card>
  );
}

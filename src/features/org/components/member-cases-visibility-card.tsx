"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setMemberCasesVisibilityAction } from "@/features/org/actions";
import { toast } from "sonner";
import { Users } from "lucide-react";

interface MemberCasesVisibilityCardProps {
  membersCanSeeAllCases: boolean;
  isOwnerAdmin: boolean;
}

export function MemberCasesVisibilityCard({ membersCanSeeAllCases, isOwnerAdmin }: MemberCasesVisibilityCardProps) {
  const [enabled, setEnabled] = useState(membersCanSeeAllCases);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    setEnabled(checked); // optimistic
    startTransition(async () => {
      const result = await setMemberCasesVisibilityAction(checked);
      if (result.success) {
        toast.success(checked ? "Miembros pueden ver todos los expedientes" : "Miembros solo ven sus expedientes");
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
          <Users className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Visibilidad de Expedientes para Miembros</CardTitle>
        </div>
        <CardDescription>
          Controla qué expedientes pueden ver los miembros del despacho.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="member-visibility" className="text-sm font-medium">
              Permitir ver todos los expedientes
            </Label>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? "Los miembros pueden ver todos los expedientes de la organización."
                : "Los miembros solo ven los expedientes asignados a ellos o los que crearon."}
            </p>
          </div>
          <Switch
            id="member-visibility"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isPending || !isOwnerAdmin}
            aria-label="Permitir a miembros ver todos los expedientes"
          />
        </div>
      </CardContent>
    </Card>
  );
}

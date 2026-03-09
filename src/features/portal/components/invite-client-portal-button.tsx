"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { inviteClientToPortalAction } from "@/features/portal/actions/client-portal";

interface InviteClientPortalButtonProps {
  clientId: string;
  /** If client already has an auth account, show disabled state */
  hasAccount?: boolean;
  /** Client email — if missing we show a warning */
  clientEmail?: string | null;
}

export function InviteClientPortalButton({
  clientId,
  hasAccount = false,
  clientEmail,
}: InviteClientPortalButtonProps) {
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleInvite = () => {
    startTransition(async () => {
      const result = await inviteClientToPortalAction(clientId);
      if (result.success) {
        setDone(true);
        toast.success("Invitación enviada", {
          description: `Se envió un correo a ${clientEmail ?? "el cliente"} para activar su portal.`,
        });
      } else {
        toast.error(result.error ?? "Error enviando la invitación");
      }
    });
  };

  if (hasAccount) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" disabled className="gap-1.5 w-full">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Portal activado
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            El cliente ya tiene una cuenta en el portal.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (done) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5 w-full">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        Invitación enviada
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleInvite}
            disabled={isPending || !clientEmail}
            className="gap-1.5 w-full"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            {isPending ? "Enviando…" : "Invitar al portal"}
          </Button>
        </TooltipTrigger>
        {!clientEmail && (
          <TooltipContent>
            El cliente no tiene email. Agrégalo primero.
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

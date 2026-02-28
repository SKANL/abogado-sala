"use client";

import { useState, useTransition } from "react";
import { revokeInvitationAction } from "@/features/org/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface RevokeInvitationButtonProps {
  invitationId: string;
  email: string;
}

export function RevokeInvitationButton({
  invitationId,
  email,
}: RevokeInvitationButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRevoke = () => {
    startTransition(async () => {
      const result = await revokeInvitationAction(invitationId);
      if (result.success) {
        toast.success("Invitación revocada");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Error al revocar la invitación");
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
          aria-label={`Revocar invitación de ${email}`}
        >
          <Trash2 className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Revocar</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Revocar invitación?</AlertDialogTitle>
          <AlertDialogDescription>
            La invitación enviada a <strong>{email}</strong> quedará cancelada y
            el enlace dejará de funcionar. Podrás enviar una nueva invitación
            cuando quieras.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRevoke}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Revocando..." : "Sí, revocar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

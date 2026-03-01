"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOrganizationAction } from "@/features/org/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";

interface Props {
  orgName: string;
}

export function DeleteOrganizationDialog({ orgName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  const isMatch = confirmation === orgName;

  function handleDelete() {
    if (!isMatch || isPending) return;

    startTransition(async () => {
      const result = await deleteOrganizationAction();
      if (result.success) {
        toast.success("Organización eliminada correctamente");
        setOpen(false);
        // Session is signed out server-side; redirect to login
        router.replace("/login");
      } else {
        toast.error(result.error ?? "Ocurrió un error al eliminar la organización");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmation(""); }}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Eliminar organización</Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <TriangleAlert className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>¿Eliminar organización?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-1">
            <span className="block">
              Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán
              <strong> todos</strong> los datos asociados a{" "}
              <span className="font-semibold text-foreground">{orgName}</span>:
            </span>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>Todos los casos, clientes y expedientes</li>
              <li>Archivos y documentos subidos por los clientes</li>
              <li>Plantillas, invitaciones y plantillas de proceso</li>
              <li>Cuentas de todos los miembros del equipo</li>
              <li>Historial de actividad y auditoría</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="confirm-name">
            Escribe{" "}
            <span className="font-semibold text-foreground select-all">{orgName}</span>{" "}
            para confirmar
          </Label>
          <Input
            id="confirm-name"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={orgName}
            disabled={isPending}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!isMatch || isPending}
            onClick={handleDelete}
          >
            {isPending ? "Eliminando..." : "Sí, eliminar para siempre"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

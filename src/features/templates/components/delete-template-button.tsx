"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { deleteTemplateAction } from "../actions";
import { toast } from "sonner";

interface DeleteTemplateButtonProps {
  templateId: string;
  templateTitle: string;
  variant?: "default" | "mobile";
}

export function DeleteTemplateButton({
  templateId,
  templateTitle,
  variant = "default",
}: DeleteTemplateButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteTemplateAction(templateId);
    if (result.success) {
      toast.success(`Plantilla "${templateTitle}" eliminada`);
      router.refresh();
    } else {
      toast.error(result.error || "No se pudo eliminar la plantilla");
    }
    setIsDeleting(false);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {variant === "mobile" ? (
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Eliminar plantilla</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Eliminar plantilla</span>
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar la plantilla{" "}
            <strong>&quot;{templateTitle}&quot;</strong>. Esta acción no se
            puede deshacer. Los expedientes existentes no se verán afectados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? "Eliminando..." : "Sí, eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

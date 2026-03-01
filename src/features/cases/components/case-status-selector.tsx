"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { updateCaseAction } from "@/features/cases/actions";
import { Database } from "@/lib/supabase/database.types";
import { STATUS_CLASSES } from "@/lib/constants";

type CaseStatus = Database["public"]["Enums"]["case_status"];

const statusMap: Record<CaseStatus, string> = {
  draft: "Borrador",
  in_progress: "En Progreso",
  review: "En Revisión",
  completed: "Completado",
  archived: "Archivado",
};

/** Statuses that require an explicit confirmation before applying */
const IRREVERSIBLE_STATUSES: CaseStatus[] = ["completed"];

const CONFIRM_MESSAGES: Partial<Record<CaseStatus, { title: string; description: string; action: string }>> = {
  completed: {
    title: "¿Marcar expediente como Completado?",
    description:
      "Esta acción cerrará el expediente. El cliente recibirá acceso final al portal y el caso quedará archivado como completado. Esta acción no es fácilmente reversible.",
    action: "Sí, marcar como completado",
  },
};

interface CaseStatusSelectorProps {
  caseId: string;
  currentStatus: CaseStatus;
}

export function CaseStatusSelector({ caseId, currentStatus }: CaseStatusSelectorProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<CaseStatus | null>(null);
  const [flash, setFlash] = useState(false);

  const applyStatusChange = async (newStatus: CaseStatus) => {
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append("case_id", caseId);
      formData.append("status", newStatus);

      const result = await updateCaseAction(null, formData);

      if (result.success) {
        toast.success("Estado actualizado correctamente");
        setFlash(true);
        setTimeout(() => setFlash(false), 600);
        router.refresh();
      } else {
        toast.error(result.error || "No se pudo actualizar el estado");
      }
    } catch {
      toast.error("Ocurrió un error inesperado al actualizar el estado");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = (newStatus: CaseStatus) => {
    if (IRREVERSIBLE_STATUSES.includes(newStatus)) {
      // Show confirmation dialog before applying
      setPendingStatus(newStatus);
    } else {
      applyStatusChange(newStatus);
    }
  };

  const confirmDialog = pendingStatus ? CONFIRM_MESSAGES[pendingStatus] : null;

  return (
    <>
      <Select
        value={currentStatus}
        onValueChange={(v) => handleStatusChange(v as CaseStatus)}
        disabled={isUpdating}
      >
        <SelectTrigger
          className={cn(
            "w-auto h-7 min-w-30 text-xs font-semibold border rounded-full px-3",
            "focus:ring-0 focus:ring-offset-0 focus-visible:ring-0",
            flash && "animate-pulse",
            STATUS_CLASSES[currentStatus] ?? ""
          )}
        >
          <SelectValue placeholder="Estado..." />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusMap).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Confirmation dialog for irreversible transitions */}
      {confirmDialog && pendingStatus && (
        <AlertDialog open={!!pendingStatus} onOpenChange={(open) => { if (!open) setPendingStatus(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingStatus(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const status = pendingStatus;
                  setPendingStatus(null);
                  applyStatusChange(status);
                }}
              >
                {confirmDialog.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}


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
import { updateCaseAction } from "@/features/cases/actions";
import { Database } from "@/lib/supabase/database.types";
import { STATUS_CLASSES } from "@/lib/constants";

type CaseStatus = Database["public"]["Enums"]["case_status"];

const statusMap: Record<CaseStatus, string> = {
  draft: "Borrador",
  in_progress: "En Progreso",
  review: "En Revisión",
  completed: "Completado",
};

interface CaseStatusSelectorProps {
  caseId: string;
  currentStatus: CaseStatus;
}

export function CaseStatusSelector({ caseId, currentStatus }: CaseStatusSelectorProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: CaseStatus) => {
    setIsUpdating(true);
    
    try {
      const formData = new FormData();
      formData.append("case_id", caseId);
      formData.append("status", newStatus);

      const result = await updateCaseAction(null, formData);
      
      if (result.success) {
        toast.success("Estado actualizado correctamente");
        router.refresh(); // Refresh the page to show the new status in the server components
      } else {
        toast.error(result.error || "No se pudo actualizar el estado");
      }
    } catch (e) {
      toast.error("Ocurrió un error inesperado al actualizar el estado");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={isUpdating}
    >
      <SelectTrigger
        className={cn(
          "w-auto h-7 min-w-30 text-xs font-semibold border rounded-full px-3",
          "focus:ring-0 focus:ring-offset-0 focus-visible:ring-0",
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
  );
}

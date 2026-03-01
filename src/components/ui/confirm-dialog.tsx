"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  /** The trigger element that opens the dialog */
  trigger: React.ReactNode;
  /** Dialog title */
  title: string;
  /** Descriptive warning message explaining the consequences */
  description: string;
  /** Label for the confirm action button */
  confirmLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Visual severity of the action */
  variant?: "destructive" | "default";
  /** Async callback — dialog stays open and shows loader until promise resolves */
  onConfirm: () => Promise<void> | void;
  /** Whether the trigger should be disabled */
  disabled?: boolean;
}

/**
 * Standardised confirm dialog for destructive or irreversible actions.
 * Wraps AlertDialog with a loading state while the async action runs.
 *
 * Usage:
 * ```tsx
 * <ConfirmDialog
 *   trigger={<Button variant="destructive">Eliminar</Button>}
 *   title="¿Eliminar expediente?"
 *   description="Esta acción es permanente y no se puede deshacer."
 *   confirmLabel="Eliminar"
 *   variant="destructive"
 *   onConfirm={handleDelete}
 * />
 * ```
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "destructive",
  onConfirm,
  disabled = false,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      // Error handling is the caller's responsibility (toast, etc.)
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={disabled ? undefined : setOpen}>
      <AlertDialogTrigger asChild disabled={disabled}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading}
            className={cn(
              variant === "destructive" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

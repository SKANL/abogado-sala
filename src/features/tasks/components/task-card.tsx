"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TaskStatusBadge, PriorityBadge } from "./task-badges";
import { EditTaskDialog } from "./edit-task-dialog";
import { updateTaskStatusAction, deleteTaskAction } from "@/features/tasks/actions";
import type { TaskItem } from "@/features/tasks/actions";
import { Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface TaskCardProps {
  task: TaskItem;
  teamMembers: { id: string; full_name: string | null; avatar_url: string | null; role: string }[];
  canDelete?: boolean;
  currentUserId: string;
  onOptimisticUpdate?: (id: string, status: TaskItem["status"]) => void;
  onOptimisticDelete?: (id: string) => void;
}

export function TaskCard({
  task,
  teamMembers,
  canDelete = false,
  currentUserId,
  onOptimisticUpdate,
  onOptimisticDelete,
}: TaskCardProps) {
  const [isPending, startTransition] = useTransition();
  const isCompleted = task.status === "completed";
  const isAssignedToMe = task.assigned_to === currentUserId;

  const handleCheck = () => {
    const nextStatus = isCompleted ? "pending" : "completed";
    onOptimisticUpdate?.(task.id, nextStatus);
    startTransition(async () => {
      const result = await updateTaskStatusAction(task.id, nextStatus);
      if (!result.success) {
        onOptimisticUpdate?.(task.id, task.status); // revert
        toast.error(result.error ?? "Error al actualizar la tarea");
      }
    });
  };

  const handleDelete = () => {
    onOptimisticDelete?.(task.id);
    startTransition(async () => {
      const result = await deleteTaskAction(task.id);
      if (!result.success) {
        toast.error(result.error ?? "Error al eliminar la tarea");
      } else {
        toast.success("Tarea eliminada");
      }
    });
  };

  const dueDateLabel = task.due_date ? (() => {
    const d = parseISO(task.due_date);
    if (isToday(d)) return "Hoy";
    return format(d, "d MMM", { locale: es });
  })() : null;

  const isOverdue = task.due_date && !isCompleted && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));

  const assignee = task.assignee;

  return (
    <Card className={cn(
      "group transition-all duration-150",
      isCompleted && "opacity-60",
      isPending && "opacity-50 pointer-events-none"
    )}>
      <CardContent className="p-3 flex items-start gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleCheck}
          className="mt-0.5 shrink-0"
          aria-label={isCompleted ? "Marcar como pendiente" : "Marcar como completada"}
        />

        {/* Body */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className={cn("text-sm font-medium leading-snug", isCompleted && "line-through text-muted-foreground")}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <TaskStatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {dueDateLabel && (
              <span className={cn(
                "inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded border",
                isOverdue
                  ? "border-red-300 text-red-600 bg-red-50"
                  : "border-slate-200 text-slate-500"
              )}>
                <Calendar className="h-3 w-3" />
                {dueDateLabel}
                {isOverdue && " · Vencida"}
              </span>
            )}
            {isAssignedToMe && !assignee && (
              <span className="text-xs text-primary font-medium">· Para mí</span>
            )}
          </div>
        </div>

        {/* Assignee avatar */}
        {assignee && (
          <Avatar className="h-6 w-6 shrink-0 text-[10px]">
            <AvatarImage src={assignee.avatar_url ?? undefined} />
            <AvatarFallback>{(assignee.full_name ?? "?")[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        )}

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <EditTaskDialog task={task} teamMembers={teamMembers} />
          {canDelete && (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              }
              title="Eliminar tarea"
              description={`¿Eliminar "${task.title}"? Esta acción no se puede deshacer.`}
              onConfirm={handleDelete}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

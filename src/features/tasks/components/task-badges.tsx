import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskStatus, TaskPriority } from "@/features/tasks/actions";

// ─── Status ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; classes: string }> = {
  pending:     { label: "Pendiente",    classes: "border-slate-400 text-slate-600 bg-slate-50" },
  in_progress: { label: "En progreso",  classes: "border-blue-400 text-blue-700 bg-blue-50" },
  completed:   { label: "Completada",   classes: "border-green-400 text-green-700 bg-green-50" },
  cancelled:   { label: "Cancelada",    classes: "border-red-300 text-red-600 bg-red-50 line-through" },
};

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", cfg.classes, className)}>
      {cfg.label}
    </Badge>
  );
}

// ─── Priority ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; classes: string; dot: string }> = {
  low:    { label: "Baja",    classes: "border-slate-300 text-slate-500", dot: "bg-slate-400" },
  medium: { label: "Media",   classes: "border-amber-300 text-amber-600", dot: "bg-amber-400" },
  high:   { label: "Alta",    classes: "border-orange-400 text-orange-600", dot: "bg-orange-500" },
  urgent: { label: "Urgente", classes: "border-red-400 text-red-600 bg-red-50", dot: "bg-red-500" },
};

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  return (
    <Badge variant="outline" className={cn("text-xs gap-1.5", cfg.classes, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
}

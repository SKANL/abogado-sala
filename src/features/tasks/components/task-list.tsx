"use client";

import { useState } from "react";
import { TaskCard } from "./task-card";
import { NewTaskDialog } from "./new-task-dialog";
import type { TaskItem, TaskStatus } from "@/features/tasks/actions";
import { CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TaskListProps {
  caseId: string;
  initialTasks: TaskItem[];
  teamMembers: { id: string; full_name: string | null; avatar_url: string | null; role: string }[];
  currentUserId: string;
  canDelete?: boolean;
}

type FilterMode = "active" | "all";

export function TaskList({
  caseId,
  initialTasks,
  teamMembers,
  currentUserId,
  canDelete = false,
}: TaskListProps) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [filter, setFilter] = useState<FilterMode>("active");

  const handleCreated = (task: TaskItem) => {
    setTasks((prev) => [task, ...prev]);
  };

  const handleOptimisticUpdate = (id: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              completed_at: status === "completed" ? new Date().toISOString() : null,
            }
          : t
      )
    );
  };

  const handleOptimisticDelete = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const visibleTasks =
    filter === "active"
      ? tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled")
      : tasks;

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalCount = tasks.filter((t) => t.status !== "cancelled").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {completedCount}/{totalCount} completadas
          </p>
          {totalCount > 0 && (
            <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden text-xs">
            <button
              onClick={() => setFilter("active")}
              className={cn(
                "px-2.5 py-1 transition-colors",
                filter === "active" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              Activas
            </button>
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-2.5 py-1 transition-colors border-l",
                filter === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              Todas
            </button>
          </div>
          <NewTaskDialog caseId={caseId} teamMembers={teamMembers} onCreated={handleCreated} />
        </div>
      </div>

      {/* List */}
      {visibleTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <CheckSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {filter === "active" ? "Sin tareas pendientes" : "Sin tareas"}
            </p>
            <p className="text-xs text-muted-foreground">
              {filter === "active"
                ? "¡Todo al día! Crea una nueva tarea si es necesario."
                : "Crea la primera tarea para este expediente."}
            </p>
          </div>
          {filter === "active" && tasks.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setFilter("all")}>
              Ver todas ({tasks.length})
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {visibleTasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                teamMembers={teamMembers}
                canDelete={canDelete}
                currentUserId={currentUserId}
                onOptimisticUpdate={handleOptimisticUpdate}
                onOptimisticDelete={handleOptimisticDelete}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

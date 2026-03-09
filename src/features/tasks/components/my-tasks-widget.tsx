import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskStatusBadge, PriorityBadge } from "@/features/tasks/components/task-badges";
import { CheckSquare, ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { getMyTasks } from "@/lib/db/queries";
import { format, isPast, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MyTasksWidgetProps {
  userId: string;
  orgId: string;
}

export async function MyTasksWidget({ userId, orgId }: MyTasksWidgetProps) {
  const tasks = await getMyTasks(userId, orgId);

  const pending = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          Mis Tareas
          {pending.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {pending.length}
            </span>
          )}
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link href="/casos">
            Ver expedientes <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No tienes tareas pendientes. ¡Buen trabajo!
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.slice(0, 6).map((task) => {
              const hasDate = !!task.due_date;
              const dateObj = hasDate ? parseISO(task.due_date!) : null;
              const isOverdue = dateObj && !isCompleted(task.status) && isPast(dateObj) && !isToday(dateObj);
              const dateLabel = dateObj
                ? isToday(dateObj) ? "Hoy" : format(dateObj, "d MMM", { locale: es })
                : null;

              return (
                <li key={task.id}>
                  <Link
                    href={`/casos/${task.case_id}`}
                    className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-muted transition-colors group"
                  >
                    <CheckSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <TaskStatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                        {dateLabel && (
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium",
                            isOverdue ? "text-red-600" : "text-muted-foreground"
                          )}>
                            <Calendar className="h-3 w-3" />
                            {dateLabel}
                            {isOverdue && " · Vencida"}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
            {pending.length > 6 && (
              <li className="text-xs text-center text-muted-foreground pt-1">
                y {pending.length - 6} más…
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function isCompleted(status: string) {
  return status === "completed";
}

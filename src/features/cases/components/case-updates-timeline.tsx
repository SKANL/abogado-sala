"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Info,
  Trophy,
  AlertTriangle,
  FileQuestion,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTransition } from "react";
import { deleteCaseUpdateAction } from "@/features/cases/actions/case-updates";

export interface CaseUpdateItem {
  id: string;
  title: string;
  body?: string | null;
  type: string;
  author_name?: string | null;
  created_at: string;
}

interface CaseUpdatesTimelineProps {
  updates: CaseUpdateItem[];
  /** If true, shows a delete button on each update (dashboard admin view) */
  canDelete?: boolean;
  /** Required when canDelete=true */
  caseId?: string;
  /** Custom message shown when there are no updates */
  emptyMessage?: string;
}

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string; badgeClass: string }
> = {
  info: {
    icon: Info,
    label: "Información",
    color: "text-blue-600 dark:text-blue-400",
    badgeClass: "border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  },
  milestone: {
    icon: Trophy,
    label: "Hito logrado",
    color: "text-amber-600 dark:text-amber-400",
    badgeClass: "border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
  },
  warning: {
    icon: AlertTriangle,
    label: "Aviso",
    color: "text-orange-600 dark:text-orange-400",
    badgeClass: "border-orange-200 text-orange-700 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
  },
  document_request: {
    icon: FileQuestion,
    label: "Documento solicitado",
    color: "text-purple-600 dark:text-purple-400",
    badgeClass: "border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
  },
};

function UpdateItem({
  update,
  canDelete,
  caseId,
}: {
  update: CaseUpdateItem;
  canDelete?: boolean;
  caseId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const config = TYPE_CONFIG[update.type] ?? TYPE_CONFIG.info;
  const Icon = config.icon;

  const handleDelete = () => {
    if (!caseId) return;
    startTransition(async () => {
      const result = await deleteCaseUpdateAction(update.id, caseId);
      if (result.success) {
        toast.success("Actualización eliminada");
      } else {
        toast.error(result.error ?? "No se pudo eliminar");
      }
    });
  };

  return (
    <div className="flex gap-3 py-3 group">
      {/* Type icon */}
      <div className={`mt-0.5 shrink-0 ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`text-[11px] ${config.badgeClass}`}>
              {config.label}
            </Badge>
            <p className="font-medium text-sm text-foreground">{update.title}</p>
          </div>
          {canDelete && caseId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              onClick={handleDelete}
              disabled={isPending}
              aria-label="Eliminar actualización"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {update.body && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {update.body}
          </p>
        )}

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70 pt-0.5">
          {update.author_name && (
            <>
              <span>{update.author_name}</span>
              <span>·</span>
            </>
          )}
          <span>
            {formatDistanceToNow(new Date(update.created_at), {
              addSuffix: true,
              locale: es,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CaseUpdatesTimeline({
  updates,
  canDelete,
  caseId,
  emptyMessage = "Aún no hay actualizaciones publicadas para este expediente.",
}: CaseUpdatesTimelineProps) {
  if (!updates || updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
        <Info className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-80">
      <div className="divide-y divide-border/60">
        {updates.map((update, i) => (
          <div key={update.id}>
            <UpdateItem update={update} canDelete={canDelete} caseId={caseId} />
            {i < updates.length - 1 && <Separator className="opacity-0" />}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

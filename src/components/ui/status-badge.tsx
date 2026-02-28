import { Badge } from "@/components/ui/badge";
import { STATUS_CLASSES, STATUS_LABELS } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Unified status badge con color semántico y etiqueta en español.
 * Usa STATUS_CLASSES + STATUS_LABELS de lib/constants para consistencia.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? status;
  const colorClass = STATUS_CLASSES[status] ?? "bg-muted/60 text-muted-foreground border-transparent";

  return (
    <Badge
      variant="outline"
      className={`${colorClass} ${className ?? ""}`}
    >
      {label}
    </Badge>
  );
}

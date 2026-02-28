export const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  in_progress: "En Progreso",
  review: "En Revisión",
  completed: "Completado",
  active: "Activo",
  prospect: "Prospecto",
  archived: "Archivado",
  pending: "Pendiente",
  accepted: "Aceptado",
  expired: "Expirado",
  revoked: "Revocado",
  suspended: "Suspendido",
};

export const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  in_progress: "default",
  review: "outline",
  completed: "outline",
  active: "default",
  prospect: "secondary",
  archived: "outline",
  pending: "secondary",
  accepted: "default",
  expired: "destructive",
  revoked: "destructive",
  suspended: "destructive",
};

/**
 * Semantic color classes for status badges.
 * Usage: <Badge variant="outline" className={STATUS_CLASSES[status]}>
 * Provides preattentive color encoding: green=ok, blue=active, amber=attention, red=critical.
 */
export const STATUS_CLASSES: Record<string, string> = {
  draft:       "bg-muted/60 text-muted-foreground border-transparent",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
  review:      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  completed:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  active:      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  prospect:    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
  archived:    "bg-muted/60 text-muted-foreground border-transparent",
  pending:     "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  accepted:    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  expired:     "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
  revoked:     "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
  suspended:   "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
};

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

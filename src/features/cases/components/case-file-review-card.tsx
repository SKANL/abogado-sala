"use client";

import { useState, useTransition } from "react";
import {
  FileText,
  Eye,
  Loader2,
  Download,
  Check,
  X,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { approveFileAction, rejectFileAction } from "@/features/cases/actions/file-review";
import { getSignedFileUrlAction } from "@/features/cases/actions";

interface ReviewFile {
  id: string;
  category: string;
  description: string | null;
  file_key: string | null;
  file_size: number;
  status: string;
  review_note?: string | null;
  reviewed_at?: string | null;
  updated_at: string;
}

interface CaseFileReviewCardProps {
  files: ReviewFile[];
  caseId: string;
  /** Show approve/reject actions. True for admin/member with case access. */
  canReview?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeVariant: "default" | "outline" | "secondary" | "destructive"; icon: React.ElementType }
> = {
  pending: { label: "Pendiente", badgeVariant: "secondary", icon: Clock },
  uploaded: { label: "Subido · En revisión", badgeVariant: "outline", icon: Eye },
  approved: { label: "Aprobado", badgeVariant: "default", icon: Check },
  rejected: { label: "Rechazado", badgeVariant: "destructive", icon: X },
  error: { label: "Error", badgeVariant: "destructive", icon: AlertTriangle },
};

export function CaseFileReviewCard({ files, caseId, canReview = false }: CaseFileReviewCardProps) {
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [rejectDialogFile, setRejectDialogFile] = useState<ReviewFile | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isRejecting, startRejectTransition] = useTransition();

  const handlePreview = async (file: ReviewFile) => {
    if (!file.file_key) {
      toast.error("El archivo aún no ha sido subido.");
      return;
    }
    setLoadingPreviewId(file.id);
    try {
      const result = await getSignedFileUrlAction(file.file_key);
      if (!result.success) throw new Error(result.error);
      if (!result.data) throw new Error("URL vacía");
      const ext = file.file_key.split(".").pop()?.toLowerCase() ?? "";
      const type = ["jpg", "jpeg", "png", "webp"].includes(ext)
        ? "image"
        : ext === "pdf"
        ? "pdf"
        : "unknown";
      setPreviewFile({ url: result.data, name: file.description ?? file.category, type });
    } catch {
      toast.error("No se pudo abrir el archivo");
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const handleApprove = async (file: ReviewFile) => {
    setApprovingId(file.id);
    const result = await approveFileAction(file.id, caseId);
    setApprovingId(null);
    if (result.success) {
      toast.success("Documento aprobado");
    } else {
      toast.error(result.error ?? "Error al aprobar");
    }
  };

  const handleRejectSubmit = () => {
    if (!rejectDialogFile || !rejectNote.trim()) return;
    const targetFile = rejectDialogFile;
    startRejectTransition(async () => {
      const result = await rejectFileAction(targetFile.id, caseId, rejectNote);
      if (result.success) {
        toast.success("Documento rechazado", {
          description: "El cliente verá el motivo y podrá volver a subirlo.",
        });
        setRejectDialogFile(null);
        setRejectNote("");
      } else {
        toast.error(result.error ?? "Error al rechazar");
      }
    });
  };

  if (!files || files.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center border-2 border-dashed rounded-md">
        No hay archivos cargados aún.
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {files.map((file) => {
          const config = STATUS_CONFIG[file.status] ?? STATUS_CONFIG.pending;
          const StatusIcon = config.icon;
          const canViewFile = !!file.file_key && (file.status === "uploaded" || file.status === "approved" || file.status === "rejected");
          const showReviewActions = canReview && file.status === "uploaded";

          return (
            <li
              key={file.id}
              className="rounded-lg border p-3 text-sm transition-colors hover:bg-muted/30 space-y-2"
            >
              {/* Top row: icon + name + status */}
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">
                    {file.description || file.category || "Sin título"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
                    {file.file_size > 0 && <span>{(file.file_size / 1024).toFixed(1)} KB</span>}
                    <Badge variant={config.badgeVariant} className="gap-1 text-[11px] h-4 px-1.5">
                      <StatusIcon className="h-2.5 w-2.5" />
                      {config.label}
                    </Badge>
                  </div>
                </div>

                {/* View button — always if file exists */}
                {canViewFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(file)}
                    disabled={loadingPreviewId === file.id}
                    className="gap-1.5 text-xs shrink-0"
                  >
                    {loadingPreviewId === file.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    Ver
                  </Button>
                )}
              </div>

              {/* Review note (rejected) */}
              {file.status === "rejected" && file.review_note && (
                <div className="rounded-md bg-destructive/8 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                  <span className="font-semibold">Motivo del rechazo: </span>
                  {file.review_note}
                </div>
              )}

              {/* Approve / Reject buttons */}
              {showReviewActions && (
                <div className="flex items-center gap-2 pt-1 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 text-xs h-7"
                    onClick={() => handleApprove(file)}
                    disabled={approvingId === file.id}
                  >
                    {approvingId === file.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/5 text-xs h-7"
                    onClick={() => { setRejectDialogFile(file); setRejectNote(""); }}
                  >
                    <X className="h-3 w-3" />
                    Rechazar
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Reject dialog */}
      <Dialog open={!!rejectDialogFile} onOpenChange={(o) => !o && setRejectDialogFile(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar documento</DialogTitle>
            <DialogDescription>
              Indica al cliente qué está mal con el documento para que pueda volver a subirlo correctamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm font-medium text-muted-foreground">
              Documento: <span className="text-foreground">{rejectDialogFile?.description ?? rejectDialogFile?.category}</span>
            </p>
            <Textarea
              placeholder="Ej: La identificación no es legible, por favor sube una foto más clara."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none"
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-right">{rejectNote.length}/500</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogFile(null)} disabled={isRejecting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={isRejecting || !rejectNote.trim()}
            >
              {isRejecting ? "Rechazando…" : "Confirmar rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File preview dialog */}
      <Dialog open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogDescription className="sr-only">Vista previa del documento</DialogDescription>
            <DialogTitle className="flex items-center justify-between mr-8">
              <span>{previewFile?.name}</span>
              {previewFile?.url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={previewFile.url} download target="_blank" rel="noreferrer">
                    <Download className="mr-2 h-4 w-4" /> Descargar
                  </a>
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-muted/20 relative overflow-hidden flex items-center justify-center p-4">
            {previewFile?.type === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewFile.url} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg rounded-md" />
            )}
            {previewFile?.type === "pdf" && (
              <iframe src={previewFile.url} className="w-full h-full rounded-md shadow-sm bg-white" title="PDF Preview" />
            )}
            {previewFile?.type === "unknown" && (
              <div className="text-center space-y-4">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                <p>No hay vista previa disponible para este tipo de archivo.</p>
                <Button asChild>
                  <a href={previewFile.url} target="_blank" rel="noreferrer">Abrir en nueva pestaña</a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

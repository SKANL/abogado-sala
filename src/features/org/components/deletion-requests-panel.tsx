"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Briefcase, User } from "lucide-react";
import {
  approveDeletionRequestAction,
  rejectDeletionRequestAction,
} from "@/features/cases/actions/deletion-requests";

interface Requester {
  full_name: string | null;
  avatar_url: string | null;
}

interface DeletionRequest {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  reason: string | null;
  status: string;
  created_at: string;
  requested_by: string;
  requester: Requester | null;
}

interface DeletionRequestsPanelProps {
  requests: DeletionRequest[];
}

const STATUS_CLASSES: Record<string, string> = {
  pending: "border-amber-500 text-amber-600",
  approved: "border-green-500 text-green-600",
  rejected: "border-red-500 text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export function DeletionRequestsPanel({ requests }: DeletionRequestsPanelProps) {
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const handleApprove = (id: string) => {
    startTransition(async () => {
      const result = await approveDeletionRequestAction(id);
      if (result.success) {
        toast.success("Solicitud aprobada y elemento eliminado.");
      } else {
        toast.error(result.error ?? "Error al aprobar solicitud");
      }
    });
  };

  const handleReject = (id: string) => {
    startTransition(async () => {
      const result = await rejectDeletionRequestAction(id, rejectReason || undefined);
      if (result.success) {
        toast.success("Solicitud rechazada.");
        setRejectTarget(null);
        setRejectReason("");
      } else {
        toast.error(result.error ?? "Error al rechazar solicitud");
      }
    });
  };

  if (requests.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Solicitudes de Eliminación</CardTitle>
              <CardDescription>
                Los miembros pueden solicitar eliminar expedientes o clientes. Revísalas aquí.
              </CardDescription>
            </div>
            {pendingCount > 0 && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {requests.map((req) => {
              const requesterName =
                req.requester?.full_name ?? "Miembro";
              const avatarUrl = req.requester?.avatar_url ?? "";

              return (
                <li key={req.id} className="flex items-start justify-between gap-3 px-6 py-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="text-[10px]">
                        {requesterName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 text-sm font-medium truncate">
                          {req.entity_type === "case" ? (
                            <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          {req.entity_label}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${STATUS_CLASSES[req.status] ?? ""}`}
                        >
                          {STATUS_LABELS[req.status] ?? req.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Solicitado por <span className="font-medium">{requesterName}</span>
                        {" · "}
                        {new Date(req.created_at).toLocaleDateString("es-MX")}
                      </p>
                      {req.reason && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          &ldquo;{req.reason}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {req.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                        disabled={isPending}
                        onClick={() => handleApprove(req.id)}
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-red-400 text-destructive hover:bg-red-50"
                        disabled={isPending}
                        onClick={() => setRejectTarget(req.id)}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Rechazar
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Reject confirmation dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El miembro recibirá una notificación con el rechazo. Puedes añadir un motivo.
          </p>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo del rechazo (opcional)</Label>
            <Textarea
              id="reject-reason"
              placeholder="Ej: El expediente aún está activo..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => rejectTarget && handleReject(rejectTarget)}
            >
              {isPending ? "Rechazando..." : "Rechazar Solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

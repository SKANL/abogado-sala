"use client";

import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoreHorizontal, UserCheck, UserX, ShieldCheck, ShieldMinus } from "lucide-react";
import { updateMemberRoleAction, deactivateMemberAction, reactivateMemberAction } from "@/features/org/actions";
import { toast } from "sonner";

interface MemberActionsMenuProps {
  memberId: string;
  memberName: string;
  currentRole: string;
  currentStatus: string;
  /** Viewer's own user id — prevents self-deactivation, hides menu for owner target */
  viewerId: string;
  /** role of the viewer */
  viewerRole: string;
}

export function MemberActionsMenu({
  memberId,
  memberName,
  currentRole,
  currentStatus,
  viewerId,
  viewerRole,
}: MemberActionsMenuProps) {
  const [isPending, startTransition] = useTransition();

  // Owners cannot be managed by admins; owners cannot manage other owners
  if (currentRole === "owner") return null;
  // Viewers must be owner or admin
  if (viewerRole !== "owner" && viewerRole !== "admin") return null;
  // Can't manage yourself
  if (memberId === viewerId) return null;

  const isActive = currentStatus === "active";
  const isAdmin = currentRole === "admin";

  const handleToggleRole = () => {
    const newRole: "admin" | "member" = isAdmin ? "member" : "admin";
    startTransition(async () => {
      const result = await updateMemberRoleAction(memberId, newRole);
      if (result.success) {
        toast.success(`Rol actualizado a "${newRole === "admin" ? "Administrador" : "Abogado"}"`);
      } else {
        toast.error(result.error ?? "Error al cambiar el rol");
      }
    });
  };

  const handleDeactivate = async () => {
    const result = await deactivateMemberAction(memberId);
    if (result.success) {
      toast.success(`${memberName} ha sido desactivado`);
    } else {
      toast.error(result.error ?? "Error al desactivar el miembro");
    }
  };

  const handleReactivate = () => {
    startTransition(async () => {
      const result = await reactivateMemberAction(memberId);
      if (result.success) {
        toast.success(`${memberName} ha sido reactivado`);
      } else {
        toast.error(result.error ?? "Error al reactivar el miembro");
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending} aria-label="Abrir menú de acciones">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="font-normal text-xs text-muted-foreground truncate">
          {memberName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Toggle role */}
        <DropdownMenuItem onClick={handleToggleRole} disabled={isPending}>
          {isAdmin ? (
            <>
              <ShieldMinus className="mr-2 h-4 w-4" />
              Cambiar a Abogado
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Promover a Admin
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Deactivate / Reactivate */}
        {isActive ? (
          <ConfirmDialog
            trigger={
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-destructive focus:text-destructive"
              >
                <UserX className="mr-2 h-4 w-4" />
                Desactivar
              </DropdownMenuItem>
            }
            title={`¿Desactivar a ${memberName}?`}
            description="El usuario perderá acceso al sistema. Podrás reactivarlo en cualquier momento."
            confirmLabel="Desactivar"
            variant="destructive"
            onConfirm={handleDeactivate}
          />
        ) : (
          <DropdownMenuItem onClick={handleReactivate} disabled={isPending}>
            <UserCheck className="mr-2 h-4 w-4" />
            Reactivar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

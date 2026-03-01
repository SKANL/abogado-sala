"use client";

import { useState, useTransition } from "react";
import { assignCaseAction } from "@/features/cases/actions/notes-and-assignee";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface CaseAssigneeSelectorProps {
  caseId: string;
  currentAssigneeId: string | null;
  teamMembers: TeamMember[];
  /** Only owners and admins can reassign */
  canAssign?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Abogado",
};

/**
 * Dropdown to assign/reassign a case to a team member.
 * Owners and admins can change assignment; members see it read-only.
 */
export function CaseAssigneeSelector({
  caseId,
  currentAssigneeId,
  teamMembers,
  canAssign = false,
}: CaseAssigneeSelectorProps) {
  const [assignedTo, setAssignedTo] = useState<string>(currentAssigneeId ?? "unassigned");
  const [isPending, startTransition] = useTransition();

  const handleChange = (value: string) => {
    const nextValue = value === "unassigned" ? null : value;
    const prev = assignedTo;
    setAssignedTo(value); // Optimistic

    startTransition(async () => {
      const result = await assignCaseAction(caseId, nextValue);
      if (result.success) {
        const member = teamMembers.find((m) => m.id === nextValue);
        toast.success(
          nextValue
            ? `Expediente asignado a ${member?.full_name ?? "abogado"}`
            : "Asignación eliminada"
        );
      } else {
        setAssignedTo(prev); // Revert on error
        toast.error(result.error || "Error al asignar");
      }
    });
  };

  const currentMember = teamMembers.find((m) => m.id === assignedTo);

  if (!canAssign) {
    // Read-only view for members
    return (
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground shrink-0">Asignado a</Label>
        {currentMember ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={currentMember.avatar_url || ""} />
              <AvatarFallback className="text-[10px]">
                {currentMember.full_name?.charAt(0).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{currentMember.full_name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Sin asignar</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground shrink-0">Asignado a</Label>
      <div className="relative">
        {isPending && (
          <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground z-10" />
        )}
        <Select value={assignedTo} onValueChange={handleChange} disabled={isPending}>
          <SelectTrigger className="h-8 text-sm min-w-[160px]">
            <SelectValue>
              {currentMember ? (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={currentMember.avatar_url || ""} />
                    <AvatarFallback className="text-[9px]">
                      {currentMember.full_name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[120px]">{currentMember.full_name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Sin asignar</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">
              <span className="text-muted-foreground">Sin asignar</span>
            </SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={member.avatar_url || ""} />
                    <AvatarFallback className="text-[10px]">
                      {member.full_name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm">{member.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {ROLE_LABELS[member.role] ?? member.role}
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

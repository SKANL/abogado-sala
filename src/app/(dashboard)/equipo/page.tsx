import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InviteMemberDialog } from "@/features/org/components/invite-member-dialog";
import { RevokeInvitationButton } from "@/features/org/components/revoke-invitation-button";
import { InvitationLinkButton } from "@/features/org/components/invitation-link-button";
import { MemberActionsMenu } from "@/features/org/components/member-actions-menu";
import { PageHeader } from "@/components/ui/page-header";

import { STATUS_LABELS } from "@/lib/constants";
import { getOrgMembersWithEmail, getOrgPendingInvitations, getDeletionRequests } from "@/lib/db/queries";
import { DeletionRequestsPanel } from "@/features/org/components/deletion-requests-panel";

// Human-readable labels for org roles.
// Add new roles here as the system expands (paralegal, secretary, accountant, etc.)
const ROLE_LABELS: Record<string, string> = {
  owner:      "Propietario",
  admin:      "Administrador",
  member:     "Abogado",
  // Future roles slot in here:
  // paralegal: "Paralegal",
  // secretary: "Secretaria",
  // accountant: "Contador",
};

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const orgId = user?.app_metadata?.org_id;
  const viewerRole = user?.app_metadata?.role as string ?? "member";
  const viewerId = user?.id ?? "";
  const canManage = viewerRole === "owner" || viewerRole === "admin";

  // All cached — revalidated by inviteMemberAction / updateMemberRoleAction etc.
  const [members, invitations, deletionRequests] = await Promise.all([
    orgId ? getOrgMembersWithEmail(orgId) : Promise.resolve([]),
    orgId ? getOrgPendingInvitations(orgId) : Promise.resolve([]),
    canManage && orgId ? getDeletionRequests(orgId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Equipo"
        description="Gestiona los miembros de tu organización."
        action={<InviteMemberDialog />}
      />

       <Card>
        <CardHeader>
            <CardTitle>Miembros Activos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            {/* Desktop View */}
            <div className="hidden md:block relative w-full overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead className="hidden lg:table-cell">Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Estado</TableHead>
                            {canManage && <TableHead className="w-12"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members?.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={member.avatar_url || ""} />
                                        <AvatarFallback>{member.full_name?.substring(0,2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium">{member.full_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                             {member.id === user?.id ? "(Tú)" : ""}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                                    {member.email ?? "—"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="capitalize">
                                        {ROLE_LABELS[member.role] ?? member.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                                        {STATUS_LABELS[member.status] ?? member.status}
                                    </Badge>
                                </TableCell>
                                {canManage && (
                                    <TableCell>
                                        <MemberActionsMenu
                                            memberId={member.id}
                                            memberName={member.full_name ?? ""}
                                            currentRole={member.role}
                                            currentStatus={member.status ?? "active"}
                                            viewerId={viewerId}
                                            viewerRole={viewerRole}
                                        />
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden grid grid-cols-1 gap-2 p-4 bg-muted/20">
                {members?.map((member) => (
                    <Card key={member.id} className="overflow-hidden">
                        <CardContent className="p-4 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                                <Avatar>
                                    <AvatarImage src={member.avatar_url || ""} />
                                    <AvatarFallback>{member.full_name?.substring(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <div className="font-semibold truncate">{member.full_name}</div>
                                    <div className="text-xs text-muted-foreground flex flex-col gap-0.5 mt-0.5">
                                        {member.email && <span className="truncate">{member.email}</span>}
                                        <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="capitalize text-[10px] h-4">
                                            {ROLE_LABELS[member.role] ?? member.role}
                                        </Badge>
                                        {member.id === user?.id && <span>(Tú)</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="h-6 text-xs">
                                    {STATUS_LABELS[member.status] ?? member.status}
                                </Badge>
                                {canManage && (
                                    <MemberActionsMenu
                                        memberId={member.id}
                                        memberName={member.full_name ?? ""}
                                        currentRole={member.role}
                                        currentStatus={member.status ?? "active"}
                                        viewerId={viewerId}
                                        viewerRole={viewerRole}
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </CardContent>
       </Card>

       {invitations && invitations.length > 0 && (
           <Card>
               <CardHeader>
                   <CardTitle>Invitaciones Pendientes</CardTitle>
                   <CardDescription>Usuarios invitados que aún no han aceptado.</CardDescription>
               </CardHeader>
                <CardContent className="p-0">
                   {/* Desktop View */}
                   <div className="hidden md:block w-full overflow-auto">
                       <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rol Invitado</TableHead>
                                    <TableHead>Enviado</TableHead>
                                    <TableHead>Enlace</TableHead>
                                    <TableHead className="w-24">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invitations.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell>{inv.email}</TableCell>
                                        <TableCell className="capitalize">{ROLE_LABELS[inv.role] ?? inv.role}</TableCell>
                                        <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <InvitationLinkButton token={inv.token} />
                                        </TableCell>
                                        <TableCell>
                                            <RevokeInvitationButton invitationId={inv.id} email={inv.email} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                       </Table>
                   </div>
                   
                   {/* Mobile View */}
                   <div className="md:hidden grid grid-cols-1 gap-2 p-4 bg-muted/20">
                       {invitations.map((inv) => (
                           <Card key={inv.id} className="overflow-hidden">
                               <CardContent className="p-4 flex flex-col gap-2">
                                   <div className="flex items-start justify-between gap-2">
                                       <div className="font-semibold text-sm truncate" title={inv.email}>{inv.email}</div>
                                       <RevokeInvitationButton invitationId={inv.id} email={inv.email} />
                                   </div>
                                   <div className="flex items-center justify-between text-xs mt-1">
                                       <Badge variant="outline" className="capitalize text-[10px] h-4">
                                           {ROLE_LABELS[inv.role] ?? inv.role}
                                       </Badge>
                                       <span className="text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</span>
                                   </div>
                               </CardContent>
                           </Card>
                       ))}
                   </div>
                </CardContent>
           </Card>
       )}

      {/* Admin: deletion requests review panel */}
      {canManage && (
        <DeletionRequestsPanel
          requests={(deletionRequests as Parameters<typeof DeletionRequestsPanel>[0]['requests'])}
        />
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InviteMemberDialog } from "@/features/org/components/invite-member-dialog";
import { RevokeInvitationButton } from "@/features/org/components/revoke-invitation-button";
import { PageHeader } from "@/components/ui/page-header";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch profiles in the org
  // We need to know the org_id. 
  // RLS on 'profiles' allows reading own org members.
  // We can just filter by org_id if we knew it, or just list all 'profiles' viewable.
  // Since RLS filters to keys in org, simple select all works.
  
  const { data: members } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  // Fetch pending invitations (if RLS allows, which it should for admins)
  const { data: invitations } = await supabase
      .from("invitations")
      .select("*")
      .eq("status", "pending");

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
                            <TableHead>Rol</TableHead>
                            <TableHead>Estado</TableHead>
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
                                <TableCell>
                                    <Badge variant="outline" className="capitalize">
                                        {member.role === 'admin' ? 'Administrador' : 'Miembro'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={member.status === 'active' ? 'default' : 'destructive'} className="capitalize">
                                        {member.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden grid grid-cols-1 gap-2 p-4 bg-muted/20">
                {members?.map((member) => (
                    <Card key={member.id} className="overflow-hidden">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={member.avatar_url || ""} />
                                    <AvatarFallback>{member.full_name?.substring(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-semibold">{member.full_name}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="capitalize text-[10px] h-4">
                                            {member.role === 'admin' ? 'Admin' : 'Miembro'}
                                        </Badge>
                                        {member.id === user?.id && <span>(Tú)</span>}
                                    </div>
                                </div>
                            </div>
                            <Badge variant={member.status === 'active' ? 'default' : 'destructive'} className="capitalize h-6 text-xs">
                                {member.status}
                            </Badge>
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
                                    <TableHead className="w-24">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invitations.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell>{inv.email}</TableCell>
                                        <TableCell className="capitalize">{inv.role}</TableCell>
                                        <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
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
                                           {inv.role}
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
    </div>
  );
}

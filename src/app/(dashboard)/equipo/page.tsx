import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InviteMemberDialog } from "@/features/org/components/invite-member-dialog";

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Equipo</h1>
          <p className="text-muted-foreground">Gestiona los miembros de tu organización.</p>
        </div>
        <InviteMemberDialog />
      </div>

       <Card>
        <CardHeader>
            <CardTitle>Miembros Activos</CardTitle>
        </CardHeader>
        <CardContent>
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
                                        {/* We don't have email in profiles by default schema design unless synced? 
                                            Schema says linked 1:1 with auth.users. 
                                            Profiles table has: full_name, avatar_url, assigned_phone.
                                            We usually don't duplicate email to profiles to avoid sync issues.
                                            But we can't get it easily without a joined view or Auth Admin API.
                                            For now, show name.
                                         */}
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
        </CardContent>
       </Card>

       {invitations && invitations.length > 0 && (
           <Card>
               <CardHeader>
                   <CardTitle>Invitaciones Pendientes</CardTitle>
                   <CardDescription>Usuarios invitados que aún no han aceptado.</CardDescription>
               </CardHeader>
               <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Rol Invitado</TableHead>
                                <TableHead>Enviado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invitations.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell>{inv.email}</TableCell>
                                    <TableCell className="capitalize">{inv.role}</TableCell>
                                    <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                   </Table>
               </CardContent>
           </Card>
       )}
    </div>
  );
}

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, Clock, Shield } from "lucide-react";

export interface TeamMemberStat {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "owner" | "admin" | "member";
  active_cases: number;
  last_active: string | null;
}

interface TeamActivityTableProps {
  members: TeamMemberStat[];
}

export function TeamActivityTable({ members }: TeamActivityTableProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Rendimiento del Equipo</CardTitle>
        <CardDescription>Actividad y carga de trabajo por abogado</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Abogado</TableHead>
              <TableHead className="text-center">Rol</TableHead>
              <TableHead className="text-center">Exp. Activos</TableHead>
              <TableHead className="text-right">Última Actividad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        No hay otros miembros en el equipo.
                    </TableCell>
                </TableRow>
            ) : (
                members.map((member) => (
                <TableRow key={member.id}>
                    <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url || ""} />
                        <AvatarFallback>{member.full_name?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
                        </Avatar>
                        <span>{member.full_name || "Sin nombre"}</span>
                    </div>
                    </TableCell>
                    <TableCell className="text-center">
                    <Badge variant={member.role === 'owner' ? 'default' : (member.role === 'admin' ? 'secondary' : 'outline')} className="w-20 justify-center">
                        {member.role === 'owner' ? 'Socio' : member.role}
                    </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 font-mono">
                            <Briefcase className="h-3 w-3 text-muted-foreground" />
                            {member.active_cases}
                        </div>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                        {member.last_active ? (
                            <div className="flex items-center justify-end gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(member.last_active).toLocaleDateString()}
                            </div>
                        ) : (
                            "N/A"
                        )}
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

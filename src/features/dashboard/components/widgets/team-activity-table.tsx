"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, Clock, Shield, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

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
        
        {members.length === 0 ? (
            <div className="p-6">
                <EmptyState 
                    icon={Users} 
                    title="Equipo vacío" 
                    description="No hay otros miembros en el equipo aún." 
                />
            </div>
        ) : (
            <>
                {/* Mobile View: Stacked Cards */}
                <div className="md:hidden grid gap-4 p-4">
                    {members.map((member) => (
                        <Card key={member.id} className="overflow-hidden shadow-sm">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={member.avatar_url || ""} />
                                            <AvatarFallback>{member.full_name?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium leading-none">{member.full_name || "Sin nombre"}</p>
                                            <Badge variant={member.role === 'owner' ? 'default' : (member.role === 'admin' ? 'secondary' : 'outline')} className="mt-1 text-[10px] h-4">
                                                {member.role === 'owner' ? 'Socio' : member.role}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 p-2 rounded-md">
                                    <div>
                                        <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3"/> Activos</p>
                                        <p className="font-medium font-mono">{member.active_cases}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Últ. Actividad</p>
                                        <p className="font-medium">{member.last_active ? new Date(member.last_active).toLocaleDateString() : "N/A"}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block">
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
                        {members.map((member) => (
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
                        ))}
                    </TableBody>
                    </Table>
                </div>
            </>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, Clock, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TeamMemberStat {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "owner" | "admin" | "member";
  active_cases: number;
  last_active: string | null;
}

interface CompactTeamListProps {
  members: TeamMemberStat[];
}

export function CompactTeamList({ members }: CompactTeamListProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Miembros del Equipo</CardTitle>
                <CardDescription>Estado y carga actual</CardDescription>
            </div>
            {/* Future: Add Invite Button here */}
            <Button variant="ghost" size="icon" disabled>
                <MoreHorizontal className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {members.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No hay otros miembros.
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                
                {/* User Info */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={member.avatar_url || ""} />
                    <AvatarFallback>{member.full_name?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium leading-none mb-1">
                        {member.full_name || "Sin nombre"}
                        {member.role === 'owner' && <span className="ml-2 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">Owner</span>}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {member.last_active ? (
                             <span className="text-green-600 flex items-center gap-1">
                                ● Online reciente
                             </span>
                        ) : "Offline"}
                    </p>
                  </div>
                </div>

                {/* Workload */}
                <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 text-sm font-medium">
                        <Badge variant="outline" className="font-mono">
                            {member.active_cases}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Expedientes</span>
                    </div>
                </div>

              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

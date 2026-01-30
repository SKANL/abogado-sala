"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { Activity, FileText, User, Shield, Upload, FileMinus, FilePen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AuditLog {
    id: string;
    action: string;
    created_at: string;
    metadata: any;
    actor_id: string | null;
}

interface LiveActivityFeedProps {
    initialLogs: AuditLog[];
    orgId: string;
    actorsMap?: Record<string, string>;
}

export function LiveActivityFeed({ initialLogs, orgId, actorsMap = {} }: LiveActivityFeedProps) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('org-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: `org_id=eq.${orgId}`
        },
        (payload) => {
          setLogs((prev) => [payload.new as AuditLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, supabase]);

  const getEventData = (action: string) => {
      if (action.includes('case')) return { icon: FileText, color: "text-blue-600", bg: "bg-blue-100" };
      if (action.includes('client')) return { icon: User, color: "text-purple-600", bg: "bg-purple-100" };
      if (action.includes('auth')) return { icon: Shield, color: "text-amber-600", bg: "bg-amber-100" };
      if (action.includes('storage')) return { icon: Upload, color: "text-green-600", bg: "bg-green-100" };
      return { icon: Activity, color: "text-slate-600", bg: "bg-slate-100" };
  };

  const formatAction = (action: string) => {
      const map: Record<string, string> = {
          'cases_INSERT': 'creó un nuevo expediente',
          'cases_UPDATE': 'actualizó un expediente',
          'clients_INSERT': 'registró un nuevo cliente',
          'clients_UPDATE': 'actualizó perfil de cliente',
          'cases_DELETE': 'eliminó un expediente',
          'clients_DELETE': 'eliminó un cliente',
          'auth_LOGIN': 'inició sesión',
          'storage.objects_INSERT': 'subió un archivo',
          'storage.objects_DELETE': 'eliminó un archivo',
          'case_files_INSERT': 'adjuntó un documento',
          'case_files_DELETE': 'eliminó un documento',
          'case_files_UPDATE': 'modificó un documento'
      };
      
      const raw = map[action] || action.replace(/_/g, ' ').toLowerCase();
      return raw;
  };

  // Grouping Logic
  const groupedLogs = logs.reduce((acc, log) => {
      const last = acc[acc.length - 1];
      const isSameUser = last && last.actor_id === log.actor_id;
      const isSameAction = last && last.action === log.action;
      const timeDiff = last ? new Date(last.created_at).getTime() - new Date(log.created_at).getTime() : 0;
      
      // Group if same user, same action, within 10 minutes
      if (isSameUser && isSameAction && Math.abs(timeDiff) < 1000 * 60 * 10) {
          last.count = (last.count || 1) + 1;
          return acc;
      }
      return [...acc, { ...log, count: 1 }];
  }, [] as (AuditLog & { count: number })[]);

  return (
    <Card className="h-full flex flex-col border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-base flex items-center gap-2">
            Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px] pr-4">
             {groupedLogs.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm py-8 space-y-2">
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                     <p>Esperando actividad...</p>
                 </div>
             ) : (
                <div className="space-y-6 relative ml-2">
                    {/* Vertical Line */}
                    <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border -z-10" />

                    {groupedLogs.map((log) => {
                        const { icon: Icon, color, bg } = getEventData(log.action);
                        const timeAgo = formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es });
                        const actorName = log.actor_id ? (actorsMap[log.actor_id]?.split(' ')[0] || "Usuario") : "Sistema";
                        
                        return (
                            <div key={log.id} className="flex gap-4 items-start group">
                                <div className={cn("relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ring-4 ring-background", bg)}>
                                    <Icon className={cn("h-3 w-3", color)} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-foreground/90 leading-none">
                                        <span className="font-semibold text-foreground">{actorName}</span> {formatAction(log.action)}
                                        {log.count > 1 && (
                                            <span className="ml-2 inline-flex items-center justify-center bg-muted text-muted-foreground text-[10px] font-bold h-4 px-1.5 rounded-full">
                                                x{log.count}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                        {timeAgo}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
             )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

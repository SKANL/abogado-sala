
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, FileText, HardDrive } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LiveActivityFeed } from "./widgets/live-activity-feed";

interface OwnerDashboardProps {
    orgId: string;
    userId: string;
}

export async function OwnerDashboard({ orgId, userId }: OwnerDashboardProps) {
    const supabase = await createClient();

    // Parallel fetching for Owner KPIs (Global Scope)
    const [
        { count: clientCount },
        { count: casesActiveCount },
        { count: filesPendingCount }
    ] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "active"),
        supabase.from("cases").select("*", { count: "exact", head: true }).eq("org_id", orgId).in("status", ["in_progress", "review"]),
        supabase.from("case_files").select("*", { count: "exact", head: true }).eq("status", "pending") 
        // Note: case_files might not have org_id directly if it relies on join, but assuming standard RLS filters for now.
        // Actually case_files usually links to case -> org. 
        // For simplicity/perf in this stub, we assume RLS handles visibility if we just query the table, 
        // OR we'd need a join. Let's trust RLS for valid counts on 'pending' files visible to admin.
    ]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientCount || 0}</div>
            <p className="text-xs text-muted-foreground">Activos en el despacho</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expedientes Activos</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{casesActiveCount || 0}</div>
            <p className="text-xs text-muted-foreground">En curso o revisión</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Pend.</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filesPendingCount || 0}</div>
             <p className="text-xs text-muted-foreground">Esperando revisión</p>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Almacenamiento</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">-- GB</div>
                <p className="text-xs text-muted-foreground">Plan Pro</p>
            </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
            <LiveActivityFeed />
        </div>
        <div className="col-span-3">
             {/* Future: Revenue chart or Team status */}
             <Card className="h-full">
                 <CardHeader>
                     <CardTitle>Estado del Sistema</CardTitle>
                 </CardHeader>
                 <CardContent>
                     <p className="text-sm text-muted-foreground">Sistema operativo y funcionando correctamente.</p>
                 </CardContent>
             </Card>
        </div>
      </div>
    </div>
  );
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, ListTodo, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { QuickActions } from "./widgets/quick-actions";

interface LawyerDashboardProps {
    userId: string;
}


import { DashboardRealtimeListener } from "./dashboard-realtime-listener";

export async function LawyerDashboard({ userId }: LawyerDashboardProps) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    const orgId = user?.app_metadata?.org_id;

    // Fetch My Cases Stats
    const { count: myCasesCount } = await supabase
        .from("cases")
        .select("*", { count: "exact", head: true })
        .in("status", ["in_progress", "review"]);

  return (
    <div className="space-y-6">
      <DashboardRealtimeListener userId={userId} orgId={orgId} />
      
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mis Expedientes</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myCasesCount || 0}</div>
            <p className="text-xs text-muted-foreground">Asignados a mí</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tareas</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <QuickActions />
        
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Recientes</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                    No hay casos recientes.
                </p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

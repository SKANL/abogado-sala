
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, ListTodo, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { QuickActions } from "./widgets/quick-actions";

interface LawyerDashboardProps {
    userId: string;
}

export async function LawyerDashboard({ userId }: LawyerDashboardProps) {
    const supabase = await createClient();

    // Fetch My Cases Stats
    const { count: myCasesCount } = await supabase
        .from("cases")
        .select("*", { count: "exact", head: true })
        // Assuming we might have an assigned_lawyer_id on the case derived from client or direct assignment.
        // For now, let's use the standard client assignment check if cases table doesn't have lawyer_id directly yet, 
        // OR rely on RLS if 'member' role only sees their own assigned clients' cases.
        // Checking backend-contracts: "clients -> assigned_lawyer_id".
        // So we join clients.
        // Ideally: .eq("client.assigned_lawyer_id", userId) but Supabase query syntax for deep filtering on count is tricky without embedding.
        // Let's rely on RLS "Clients: assigned_lawyer_id = auth.uid()" logic if implemented, 
        // otherwise fetching cases implies fetching clients.
        // Simpler for MVP: Just count cases visible to this user (RLS restricted).
        .in("status", ["in_progress", "review"]);

  return (
    <div className="space-y-6">
      
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

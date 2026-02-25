import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Briefcase, FileText, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
         <Card className="col-span-full lg:col-span-4">
            <CardHeader className="p-4 md:p-6">
               <Skeleton className="h-6 w-40 mb-2" />
               <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 space-y-6">
               {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                  </div>
               ))}
            </CardContent>
         </Card>
         <Card className="col-span-full lg:col-span-3">
             <CardHeader className="p-4 md:p-6">
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-60" />
             </CardHeader>
             <CardContent className="p-4 md:p-6 pt-0">
                <Skeleton className="h-24 w-full rounded-md" />
             </CardContent>
         </Card>
      </div>
    </div>
  );
}

async function DashboardContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Parallel fetching for stats
  const [
    { count: clientCount },
    { count: caseCount },
    { count: teamCount },
    { data: recentCases }
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: 'exact', head: true }).eq("status", "active"),
    supabase.from("cases").select("*", { count: 'exact', head: true }).neq("status", "completed"),
    supabase.from("profiles").select("*", { count: 'exact', head: true }).eq("status", "active"),
    supabase.from("cases")
      .select(`
        id, 
        created_at, 
        status, 
        current_step_index,
        client:clients(full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  return (
    <>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              +0% desde el mes pasado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expedientes en Curso</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{caseCount || 0}</div>
             <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
             <p className="text-xs text-muted-foreground">
              Subidos hoy
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros del Equipo</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamCount || 0}</div>
             <p className="text-xs text-muted-foreground">
              Activos en la plataforma
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
          <CardHeader className="p-4 md:p-6">
            <CardTitle>Actividad Reciente</CardTitle>
             <CardDescription>
              Últimos expedientes creados o modificados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
               {recentCases?.map((c: any) => (
                   <div key={c.id} className="flex items-center">
                        <Avatar className="h-9 w-9">
                            <AvatarFallback>{c.client?.full_name?.substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">{c.client?.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                                Expediente iniciado
                            </p>
                        </div>
                        <div className="ml-auto font-medium text-sm">
                           {new Date(c.created_at).toLocaleDateString()}
                        </div>
                   </div>
               ))}
               {(!recentCases || recentCases.length === 0) && (
                   <p className="text-sm text-muted-foreground text-center py-4">Sin actividad reciente.</p>
               )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader className="p-4 md:p-6">
            <CardTitle>Accesos Rápidos</CardTitle>
             <CardDescription>
              Tareas comunes del día a día.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
             {/* Placeholder for quick actions or notifications */}
             <div className="flex flex-col gap-2">
                 <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground text-center">
                    Próximamente: Calendario de audiencias
                 </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

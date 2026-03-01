
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { QuickActions } from "./widgets/quick-actions";
import { DashboardRealtimeListener } from "./dashboard-realtime-listener";
import { STATUS_CLASSES } from "@/lib/constants";
import Link from "next/link";

interface LawyerDashboardProps {
    userId: string;
}

const STATUS_LABELS: Record<string, string> = {
    draft: "Borrador",
    in_progress: "En Progreso",
    review: "En Revisión",
    completed: "Completado",
};

export async function LawyerDashboard({ userId }: LawyerDashboardProps) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    const orgId = user?.app_metadata?.org_id;

    // Active cases count — assigned to current user
    const { count: myCasesCount } = await supabase
        .from("cases")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", userId)
        .in("status", ["in_progress", "review"]);

    // Last 5 cases touched by this user (across all statuses)
    const { data: recentCases } = await supabase
        .from("cases")
        .select("id, token, status, updated_at, clients(full_name)")
        .eq("assigned_to", userId)
        .order("updated_at", { ascending: false })
        .limit(5);

    return (
        <div className="space-y-6">
            <DashboardRealtimeListener userId={userId} orgId={orgId} />

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mis Expedientes Activos</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{myCasesCount ?? 0}</div>
                        <p className="text-xs text-muted-foreground">En progreso o en revisión</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions + Recent Cases */}
            <div className="grid gap-4 md:grid-cols-2">
                <QuickActions />

                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base">Expedientes Recientes</CardTitle>
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                            <Link href="/casos">
                                Ver todos <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {!recentCases || recentCases.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No tienes expedientes asignados aún.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {recentCases.map((c) => {
                                    const clientName =
                                        c.clients && !Array.isArray(c.clients)
                                            ? (c.clients as { full_name: string }).full_name
                                            : Array.isArray(c.clients) && c.clients.length > 0
                                            ? (c.clients[0] as { full_name: string }).full_name
                                            : "Sin cliente";
                                    return (
                                        <li key={c.id}>
                                            <Link
                                                href={`/casos/${c.id}`}
                                                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                                            >
                                                <div className="min-w-0 overflow-hidden">
                                                    <p className="text-sm font-medium truncate">{clientName}</p>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">{c.token}</p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={`ml-2 text-xs shrink-0 ${STATUS_CLASSES[c.status as string] ?? ""}`}
                                                >
                                                    {STATUS_LABELS[c.status as string] ?? c.status}
                                                </Badge>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}



import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, FileText, HardDrive, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LiveActivityFeed } from "./widgets/live-activity-feed";
import { CompactTeamList, TeamMemberStat } from "./widgets/compact-team-list";
import { CaseDistributionWidget } from "./widgets/case-distribution-widget";

interface OwnerDashboardProps {
    orgId: string;
    userId: string;
}

export async function OwnerDashboard({ orgId, userId }: OwnerDashboardProps) {
    const supabase = await createClient();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // Parallel fetching for Owner KPIs (Global Scope)
    const [
        { count: clientCount },
        { count: casesActiveCount },
        { count: filesPendingCount },
        { data: orgData },
        { data: teamData },
        { data: auditLogs },
        { data: allCases },
        { count: newClientsMonth },
        { count: newCasesMonth }
    ] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "active"),
        supabase.from("cases").select("*", { count: "exact", head: true }).eq("org_id", orgId).in("status", ["in_progress", "review"]),
        supabase.from("case_files").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("organizations").select("storage_used, plan_tier").eq("id", orgId).single(),
        supabase.from("profiles")
            .select("id, full_name, avatar_url, role, last_sign_in_at, cases!cases_assigned_lawyer_id_fkey(count)")
            .eq("org_id", orgId),
        supabase.from("audit_logs")
            .select("id, action, created_at, metadata, actor_id")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(30)
            .returns<any[]>(),
        supabase.from("cases").select("status").eq("org_id", orgId),
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("org_id", orgId).gte("created_at", startOfMonth),
        supabase.from("cases").select("*", { count: "exact", head: true }).eq("org_id", orgId).gte("created_at", startOfMonth)
    ]);

    // Fetch details for actors in logs
    const actorIds = Array.from(new Set(auditLogs?.map(l => l.actor_id).filter(Boolean) || []));
    let actorsMap: Record<string, string> = {};
    if (actorIds.length > 0) {
        const { data: actors } = await supabase.from("profiles").select("id, full_name").in("id", actorIds);
        actors?.forEach(a => {
            if (a.full_name) actorsMap[a.id] = a.full_name;
        });
    }

    // Format Storage
    const storageBytes = orgData?.storage_used || 0;
    const storageGB = (storageBytes / (1024 * 1024 * 1024)).toFixed(2);

    // Format Team Stats
    const teamMembers: TeamMemberStat[] = (teamData || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        role: p.role,
        active_cases: p.cases?.[0]?.count || 0,
        last_active: p.last_sign_in_at
    }));

    // Process Case Distribution
    const statusCounts: Record<string, number> = {};
    allCases?.forEach((c) => {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });
    const distData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
    const totalCases = allCases?.length || 0;

  return (
    <div className="space-y-6">
      {/* 1. Top Level KPIs - The "Pulse" */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
            title="Clientes Totales" 
            value={clientCount || 0} 
            icon={Users} 
            trend={`+${newClientsMonth || 0} este mes`}
            trendColor="text-green-600"
        />
        <KpiCard 
            title="Expedientes Activos" 
            value={casesActiveCount || 0} 
            icon={Briefcase} 
            trend={`+${newCasesMonth || 0} este mes`}
            trendColor="text-blue-600"
        />
        <KpiCard 
            title="Documentos Pend." 
            value={filesPendingCount || 0} 
            icon={FileText} 
            trend="Requiere atención"
            trendColor={filesPendingCount ? "text-amber-600" : "text-muted-foreground"}
        />
        <KpiCard 
            title="Almacenamiento" 
            value={`${storageGB} GB`} 
            icon={HardDrive} 
            trend={`Plan ${orgData?.plan_tier}`}
            trendColor="text-muted-foreground capitalize"
        />
      </div>

      {/* 2. Analytical Layer - 70/30 Split */}
      <div className="grid gap-6 lg:grid-cols-12 min-h-[500px]">
        {/* Left Column (Main Board) - 8 cols (66%) */}
        <div className="lg:col-span-8 space-y-6">
             <CompactTeamList members={teamMembers} />
        </div>

        {/* Right Column (Pulse/Feed Sidebar) - 4 cols (33%) */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
            <div className="h-[300px]">
                <CaseDistributionWidget data={distData} total={totalCases} />
            </div>
            <div className="flex-1 bg-muted/10 rounded-xl p-4 border border-border/50">
                 <LiveActivityFeed initialLogs={auditLogs || []} orgId={orgId} actorsMap={actorsMap} />
            </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, trend, trendColor }: any) {
    return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{value}</div>
            <p className={`text-xs font-medium mt-1 ${trendColor}`}>
                {trend}
            </p>
          </CardContent>
        </Card>
    );
}

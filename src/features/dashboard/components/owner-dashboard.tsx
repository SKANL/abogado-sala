
import { Users, Briefcase, FileText, HardDrive, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LiveActivityFeed } from "./widgets/live-activity-feed";
import { CompactTeamList, TeamMemberStat } from "./widgets/compact-team-list";
import { CaseDistributionWidget } from "./widgets/case-distribution-widget";
import { KpiCard } from "./widgets/kpi-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OnboardingChecklist } from "./onboarding-checklist";

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
        { count: newCasesMonth },
        { count: templateCount },
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
        supabase.from("cases").select("*", { count: "exact", head: true }).eq("org_id", orgId).gte("created_at", startOfMonth),
        supabase.from("templates").select("*", { count: "exact", head: true }).eq("org_id", orgId),
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
    <div className="space-y-4">
      {/* Onboarding checklist — visible only when org has no data yet */}
      <OnboardingChecklist
        hasTemplate={(templateCount ?? 0) > 0}
        hasClient={(clientCount ?? 0) > 0}
        hasCase={(allCases?.length ?? 0) > 0}
      />

      {/* 1. Top Level KPIs - The "Pulse" */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <KpiCard 
            title="Clientes Totales" 
            value={clientCount || 0} 
            icon={<Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0 ml-1" />} 
            trend={`+${newClientsMonth || 0} este mes`}
            trendColor="text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard 
            title="Expedientes Activos" 
            value={casesActiveCount || 0} 
            icon={<Briefcase className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0 ml-1" />} 
            trend={`+${newCasesMonth || 0} este mes`}
            trendColor="text-primary"
        />
        <KpiCard 
            title="Documentos Pend." 
            value={filesPendingCount || 0} 
            icon={<FileText className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0 ml-1" />} 
            trend={filesPendingCount ? "Requiere atención" : "Todo al día"}
            trendColor={filesPendingCount ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}
        />
        <KpiCard 
            title="Almacenamiento" 
            value={`${storageGB} GB`} 
            icon={<HardDrive className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0 ml-1" />} 
            trend={`Plan ${orgData?.plan_tier}`}
            trendColor="text-muted-foreground capitalize"
        />
      </div>

      {/* 2. Analytical Layer - Responsive Handling */}
      
      {/* Desktop View: 70/30 Split Grid (lg and up) */}
      <div className="hidden lg:grid gap-6 lg:grid-cols-12">
        {/* Left Column (Main Board) - 8 cols (66%) */}
        <div className="lg:col-span-8 space-y-6">
             <CompactTeamList members={teamMembers} />
        </div>

        {/* Right Column (Pulse/Feed Sidebar) - 4 cols (33%) */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
            <CaseDistributionWidget data={distData} total={totalCases} />
            <LiveActivityFeed initialLogs={auditLogs || []} orgId={orgId} actorsMap={actorsMap} />
        </div>
      </div>

      {/* Mobile/Tablet View: Quick Tabbing (below lg) */}
      <div className="lg:hidden">
         <Tabs defaultValue="actividad" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="actividad">Métricas & Actividad</TabsTrigger>
                <TabsTrigger value="equipo">Equipo</TabsTrigger>
            </TabsList>
            <TabsContent value="actividad" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                <CaseDistributionWidget data={distData} total={totalCases} />
                <LiveActivityFeed initialLogs={auditLogs || []} orgId={orgId} actorsMap={actorsMap} />
            </TabsContent>
            <TabsContent value="equipo" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                <CompactTeamList members={teamMembers} />
            </TabsContent>
         </Tabs>
      </div>
    </div>
  );
}

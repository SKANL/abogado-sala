
import { Users, Briefcase, FileText, HardDrive, Inbox } from "lucide-react";
import { LiveActivityFeed } from "./widgets/live-activity-feed";
import { CompactTeamList, TeamMemberStat } from "./widgets/compact-team-list";
import { CaseDistributionWidget } from "./widgets/case-distribution-widget";
import { KpiCard } from "./widgets/kpi-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OnboardingChecklist } from "./onboarding-checklist";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import {
  getOrgDashboardKpis,
  getOrgSettings,
  getOrgTeam,
  getOrgCaseDistribution,
  getOrgAuditLogsWithActors,
  getDeletionRequests,
} from "@/lib/db/queries";
import { DashboardRealtimeListener } from "./dashboard-realtime-listener";

interface OwnerDashboardProps {
    orgId: string;
}

export async function OwnerDashboard({ orgId }: OwnerDashboardProps) {
    // All queries are cached — zero DB round trips on repeated navigation
    const [kpis, orgData, teamData, allCases, { logs: auditLogs, actorsMap }, allDeletionRequests] = await Promise.all([
        getOrgDashboardKpis(orgId),
        getOrgSettings(orgId),
        getOrgTeam(orgId),
        getOrgCaseDistribution(orgId),
        getOrgAuditLogsWithActors(orgId),
        getDeletionRequests(orgId),
    ]);

    const pendingDeletionCount = (allDeletionRequests ?? []).filter((r) => r.status === "pending").length;

    const { clientCount, casesActiveCount, filesPendingCount, newClientsMonth, newCasesMonth, templateCount } = kpis;

    // Format Storage
    const storageBytes = orgData?.storage_used || 0;
    const storageGB = (storageBytes / (1024 * 1024 * 1024)).toFixed(2);

    // Format Team Stats
    const teamMembers: TeamMemberStat[] = (teamData || []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        role: p.role,
        active_cases: p.cases?.[0]?.count || 0,
        last_active: p.updated_at  // updated_at serves as a proxy for last activity
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
      <DashboardRealtimeListener orgId={orgId} />
      {/* Onboarding checklist — visible only when org has no data yet */}
      <OnboardingChecklist
        hasTemplate={(templateCount ?? 0) > 0}
        hasClient={(clientCount ?? 0) > 0}
        hasCase={(allCases?.length ?? 0) > 0}
      />

      {/* Pending deletion requests alert */}
      {pendingDeletionCount > 0 && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
          <Inbox className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            <span className="font-semibold">{pendingDeletionCount} solicitud{pendingDeletionCount > 1 ? "es" : ""} de eliminación pendiente{pendingDeletionCount > 1 ? "s" : ""}.</span>{" "}
            <Link href="/equipo" className="underline hover:no-underline">
              Revisar en Equipo →
            </Link>
          </AlertDescription>
        </Alert>
      )}

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

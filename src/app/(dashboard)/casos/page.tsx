import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { CasesTable } from "@/features/cases/components/cases-table";
import { PageHeader } from "@/components/ui/page-header";
import { getCasesList, getOrgSettings, type CasesViewMode } from "@/lib/db/queries";
import { CasesListRealtime } from "@/features/cases/components/cases-list-realtime";
import { CasesViewToggle } from "@/features/cases/components/cases-view-toggle";

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role ?? "member";
  const orgId = user?.app_metadata?.org_id;
  const userId = user?.id;
  const isMember = role === "member";

  const { view: rawView } = await searchParams;

  // For admins: always show all. For members: respect org setting + default to 'assigned'
  let allowAll = !isMember;
  if (isMember) {
    const orgSettings = await getOrgSettings(orgId);
    allowAll = orgSettings?.members_can_see_all_cases ?? false;
  }

  const validViews: CasesViewMode[] = ["assigned", "mine", "all"];
  const requestedView = validViews.includes(rawView as CasesViewMode)
    ? (rawView as CasesViewMode)
    : null;

  // Enforce: member cannot see 'all' if not allowed
  const view: CasesViewMode = isMember
    ? requestedView === "all" && !allowAll
      ? "assigned"
      : requestedView ?? "assigned"
    : "all";

  const cases = await getCasesList(orgId, userId, view);

  return (
    <div className="space-y-4">
      {orgId && <CasesListRealtime orgId={orgId} />}
      <PageHeader
        title="Expedientes"
        description="Gestiona los trámites en curso."
        action={
          <div className="flex items-center gap-2">
            {isMember && (
              <CasesViewToggle currentView={view} allowAll={allowAll} />
            )}
            {/* Toggle to Kanban view */}
            <Button asChild variant="outline" size="sm">
              <Link href="/casos/kanban">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Vista Kanban
              </Link>
            </Button>
            <Button asChild>
              <Link href="/casos/new">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Expediente
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <CasesTable cases={cases ?? []} />
      </Card>
    </div>
  );
}

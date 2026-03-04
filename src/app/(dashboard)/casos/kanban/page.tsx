import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, LayoutList } from "lucide-react";
import Link from "next/link";
import { CasesKanban } from "@/features/cases/components/cases-kanban";
import { PageHeader } from "@/components/ui/page-header";
import { getCasesKanban, getOrgSettings, type CasesViewMode } from "@/lib/db/queries";
import { CasesViewToggle } from "@/features/cases/components/cases-view-toggle";

export default async function CasesKanbanPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.app_metadata?.role ?? "member";
    const isMember = role === "member";
    const orgId = user?.app_metadata?.org_id as string;
    const userId = user?.id;

    const { view: rawView } = await searchParams;

    let allowAll = !isMember;
    if (isMember) {
        const orgSettings = await getOrgSettings(orgId);
        allowAll = orgSettings?.members_can_see_all_cases ?? false;
    }

    const validViews: CasesViewMode[] = ["assigned", "mine", "all"];
    const requestedView = validViews.includes(rawView as CasesViewMode)
        ? (rawView as CasesViewMode)
        : null;

    const view: CasesViewMode = isMember
        ? requestedView === "all" && !allowAll
            ? "assigned"
            : requestedView ?? "assigned"
        : "all";

    const cases = await getCasesKanban(orgId, userId, view);

    return (
        <div className="space-y-4">
            <PageHeader
                title="Expedientes — Kanban"
                description="Arrastra los expedientes entre columnas para actualizar su estado."
                action={
                    <div className="flex items-center gap-2">
                        {isMember && (
                            <CasesViewToggle currentView={view} allowAll={allowAll} />
                        )}
                        {/* Toggle back to list view */}
                        <Button asChild variant="outline" size="sm">
                            <Link href="/casos">
                                <LayoutList className="mr-2 h-4 w-4" />
                                Vista Lista
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

            <CasesKanban cases={(cases ?? []) as unknown as Parameters<typeof CasesKanban>[0]['cases']} />
        </div>
    );
}

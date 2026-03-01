import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, LayoutList } from "lucide-react";
import Link from "next/link";
import { CasesKanban } from "@/features/cases/components/cases-kanban";
import { PageHeader } from "@/components/ui/page-header";
import { getCasesKanban } from "@/lib/db/queries";

export default async function CasesKanbanPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.app_metadata?.role ?? "member";
    const isMember = role === "member";
    const orgId = user?.app_metadata?.org_id as string;
    const userId = user?.id;

    // Cached — revalidated when cases change
    const cases = await getCasesKanban(orgId, userId, isMember);

    return (
        <div className="space-y-4">
            <PageHeader
                title="Expedientes — Kanban"
                description="Arrastra los expedientes entre columnas para actualizar su estado."
                action={
                    <div className="flex items-center gap-2">
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

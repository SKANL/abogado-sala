import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, LayoutList } from "lucide-react";
import Link from "next/link";
import { CasesKanban } from "@/features/cases/components/cases-kanban";
import { PageHeader } from "@/components/ui/page-header";

export default async function CasesKanbanPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.app_metadata?.role ?? "member";
    const isMember = role === "member";

    let query = supabase
        .from("cases")
        .select(`id, token, status, created_at, client:clients(full_name)`)
        .order("created_at", { ascending: false });

    if (isMember && user) {
        query = query.eq("assigned_to", user.id);
    }

    const { data: cases } = await query;

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

            <CasesKanban cases={(cases ?? []) as any} />
        </div>
    );
}

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { CasesTable } from "@/features/cases/components/cases-table";
import { PageHeader } from "@/components/ui/page-header";
import { getCasesList } from "@/lib/db/queries";

export default async function CasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role ?? "member";
  const isMember = role === "member";

  // Cached: zero DB hit on repeated navigation within stale window
  const cases = await getCasesList(
    user?.app_metadata?.org_id,
    user?.id,
    isMember
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expedientes"
        description="Gestiona los trámites en curso."
        action={
          <div className="flex items-center gap-2">
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

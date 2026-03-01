import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { CasesTable } from "@/features/cases/components/cases-table";
import { PageHeader } from "@/components/ui/page-header";

export default async function CasesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role ?? "member";
  const isMember = role === "member";

  let query = supabase
    .from("cases")
    .select(`*, client:clients(full_name)`)
    .order("created_at", { ascending: false });

  // Lawyers only see their assigned cases; owners/admins see everything.
  if (isMember && user) {
    query = query.eq("assigned_to", user.id);
  }

  const { data: cases } = await query;

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

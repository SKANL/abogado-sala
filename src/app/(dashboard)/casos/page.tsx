import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";
import { CasesTable } from "@/features/cases/components/cases-table";
import { PageHeader } from "@/components/ui/page-header";

export default async function CasesPage() {
  const supabase = await createClient();
  const { data: cases } = await supabase
    .from("cases")
    .select(`
        *,
        client:clients(full_name)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expedientes"
        description="Gestiona los trámites en curso."
        action={
          <Button asChild>
            <Link href="/casos/new">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Expediente
            </Link>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <CasesTable cases={cases ?? []} />
      </Card>
    </div>
  );
}

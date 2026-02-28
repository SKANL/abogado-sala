import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";
import { CasesTable } from "@/features/cases/components/cases-table";

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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight">Expedientes</h1>
          <p className="text-sm text-muted-foreground">Gestiona los trámites en curso.</p>
        </div>
        <Button asChild>
            <Link href="/casos/new">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Expediente
            </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CasesTable cases={cases ?? []} />
      </Card>
    </div>
  );
}

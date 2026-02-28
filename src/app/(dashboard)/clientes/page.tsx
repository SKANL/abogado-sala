import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ClientsTable } from "@/features/clients/components/clients-table";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gestiona tus clientes y prospectos.</p>
        </div>
        <Button asChild>
            <Link href="/clientes/new">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
            </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <ClientsTable clients={clients ?? []} />
      </Card>
    </div>
  );
}

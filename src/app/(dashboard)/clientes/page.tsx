import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ClientsTable } from "@/features/clients/components/clients-table";
import { PageHeader } from "@/components/ui/page-header";
import { getClientsList } from "@/lib/db/queries";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.app_metadata?.org_id;

  // Cached: revalidated by createClientAction / updateClientAction / deleteClientAction
  const clients = await getClientsList(orgId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Gestiona tus clientes y prospectos."
        action={
          <Button asChild>
            <Link href="/clientes/new">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
            </Link>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <ClientsTable clients={clients ?? []} />
      </Card>
    </div>
  );
}

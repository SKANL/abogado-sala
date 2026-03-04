import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ClientsTable } from "@/features/clients/components/clients-table";
import { PageHeader } from "@/components/ui/page-header";
import { getClientsList, getOrgSettings, type ClientsViewMode } from "@/lib/db/queries";
import { ClientsListRealtime } from "@/features/clients/components/clients-list-realtime";
import { ClientsViewToggle } from "@/features/clients/components/clients-view-toggle";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.app_metadata?.org_id;
  const userId = user?.id;
  const role = user?.app_metadata?.role ?? "member";
  const isMember = role === "member";

  const { view: rawView } = await searchParams;

  let allowAll = !isMember;
  if (isMember) {
    const orgSettings = await getOrgSettings(orgId);
    allowAll = orgSettings?.members_can_see_all_clients ?? false;
  }

  const validViews: ClientsViewMode[] = ["mine", "all"];
  const requestedView = validViews.includes(rawView as ClientsViewMode)
    ? (rawView as ClientsViewMode)
    : null;

  const view: ClientsViewMode = isMember
    ? requestedView === "all" && !allowAll
      ? "mine"
      : requestedView ?? (allowAll ? "all" : "mine")
    : "all";

  // Cached: revalidated by createClientAction / updateClientAction / deleteClientAction
  const clients = await getClientsList(orgId, userId, view);

  return (
    <div className="space-y-4">
      {orgId && <ClientsListRealtime orgId={orgId} />}
      <PageHeader
        title="Clientes"
        description="Gestiona tus clientes y prospectos."
        action={
          <div className="flex items-center gap-2">
            {isMember && (
              <ClientsViewToggle currentView={view} allowAll={allowAll} />
            )}
            <Button asChild>
              <Link href="/clientes/new">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <ClientsTable clients={clients ?? []} />
      </Card>
    </div>
  );
}

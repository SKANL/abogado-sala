import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrgSettingsForm } from "@/features/org/components/org-settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgId = user.app_metadata?.org_id as string;
  const role = (user.app_metadata?.role ?? "member") as string;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, primary_color, logo_url")
    .eq("id", orgId)
    .single();

  if (!org) redirect("/login");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Ajustes de Organización</h3>
        <p className="text-sm text-muted-foreground">
          Gestiona la marca y configuración de {org.name}.
        </p>
      </div>
      <OrgSettingsForm
        orgId={org.id}
        orgName={org.name}
        primaryColor={org.primary_color}
        logoUrl={org.logo_url}
        isOwner={role === "owner"}
      />
    </div>
  );
}

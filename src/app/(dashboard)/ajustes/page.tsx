import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrgSettingsForm } from "@/features/org/components/org-settings-form";
import { MemberCasesVisibilityCard } from "@/features/org/components/member-cases-visibility-card";
import { MemberClientsVisibilityCard } from "@/features/org/components/member-clients-visibility-card";
import { WhatsAppTemplateCard } from "@/features/org/components/whatsapp-template-card";
import { getOrgSettings } from "@/lib/db/queries";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgId = user.app_metadata?.org_id as string;
  const role = (user.app_metadata?.role ?? "member") as string;
  const isOwnerAdmin = role === "owner" || role === "admin";

  // Cached — revalidated by updateOrganizationAction
  const org = await getOrgSettings(orgId);

  if (!org) redirect("/login");

  const orgConsentText: string | null = org.consent_text ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Ajustes de Organización</h3>
        <p className="text-sm text-muted-foreground">
          Gestiona la marca y configuración de {org.name}.
        </p>
      </div>

      <MemberCasesVisibilityCard
        membersCanSeeAllCases={org.members_can_see_all_cases}
        isOwnerAdmin={isOwnerAdmin}
      />

      <MemberClientsVisibilityCard
        membersCanSeeAllClients={org.members_can_see_all_clients ?? false}
        isOwnerAdmin={isOwnerAdmin}
      />

      <WhatsAppTemplateCard
        currentTemplate={org.whatsapp_template ?? null}
        orgName={org.name ?? ""}
        isOwnerAdmin={isOwnerAdmin}
      />

      <OrgSettingsForm
        orgId={org.id}
        orgName={org.name}
        primaryColor={org.primary_color}
        logoUrl={org.logo_url}
        isOwner={role === "owner"}
        consentText={orgConsentText}
      />
    </div>
  );
}

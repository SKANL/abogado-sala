import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PortalWizard } from "@/features/portal/components/portal-wizard";
import { PortalCompletedScreen } from "@/features/portal/components/portal-completed-screen";
import type { PortalFile } from "@/features/portal/actions";

async function RoomContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  // Parallel: case data + org branding
  const [caseResult, brandingResult] = await Promise.all([
    supabase.rpc("get_case_by_token", { p_token: token }),
    supabase.rpc("get_case_validation", { p_token: token }),
  ]);

  const { data: resultData, error } = caseResult;

  if (error || !resultData) {
      console.error("Portal Error:", error);
      const isExpired = error?.message?.toLowerCase().includes('expir');
      redirect(`/portal-error${isExpired ? '?reason=expired' : ''}`);
  }

  const result = resultData as { case: Record<string, unknown>; client_name: string; files: PortalFile[] };
  const caseData = result.case;
  const clientName = result.client_name;
  const files = result.files || [];

  // Extract org branding (non-critical — fallback gracefully)
  const brandingRow = brandingResult.data?.[0];
  const orgName: string | undefined = brandingRow?.org_name;
  const orgLogoUrl: string | undefined = brandingRow?.org_logo_url;

  // Fetch org consent_text for the portal wizard (non-critical)
  let orgConsentText: string | null = null;
  if (caseData?.org_id) {
    const orgId = caseData.org_id as string;
    const { data: orgData } = await supabase
      .from("organizations")
      .select("consent_text")
      .eq("id", orgId)
      .single();
    orgConsentText = (orgData as { consent_text?: string | null } | null)?.consent_text ?? null;
  }

  // Completed cases get a special re-entry screen instead of the wizard
  if (caseData?.status === "completed") {
    return (
      <PortalCompletedScreen
        clientName={clientName}
        caseToken={token}
        orgName={orgName}
        orgLogoUrl={orgLogoUrl}
        files={files as unknown as Parameters<typeof PortalCompletedScreen>[0]['files']}
      />
    );
  }

  return (
    <PortalWizard 
      token={token}
      initialCaseData={caseData}
      clientName={clientName}
      files={files}
      orgName={orgName}
      orgLogoUrl={orgLogoUrl}
      orgConsentText={orgConsentText}
    />
  );
}

export default async function RoomPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense>
      <RoomContent params={params} />
    </Suspense>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PortalWizard } from "@/features/portal/components/portal-wizard";
import { PortalCompletedScreen } from "@/features/portal/components/portal-completed-screen";

export default async function RoomPage({ params }: { params: { token: string } }) {
  const supabase = await createClient();
  const { token } = await params;

  // Parallel: case data + org branding
  const [caseResult, brandingResult] = await Promise.all([
    supabase.rpc("get_case_by_token", { p_token: token }),
    (supabase as any).rpc("get_case_validation", { p_token: token }),
  ]);

  const { data: resultData, error } = caseResult;

  if (error || !resultData) {
      console.error("Portal Error:", error);
      const isExpired = error?.message?.toLowerCase().includes('expir');
      redirect(`/portal-error${isExpired ? '?reason=expired' : ''}`);
  }

  const result = resultData as any;
  const caseData = result.case;
  const clientName = result.client_name;
  const files = result.files || [];

  // Extract org branding (non-critical — fallback gracefully)
  const brandingRow = brandingResult.data?.[0];
  const orgName: string | undefined = brandingRow?.org_name;
  const orgLogoUrl: string | undefined = brandingRow?.org_logo_url;

  // Completed cases get a special re-entry screen instead of the wizard
  if (caseData?.status === "completed") {
    return (
      <PortalCompletedScreen
        clientName={clientName}
        caseToken={token}
        orgName={orgName}
        orgLogoUrl={orgLogoUrl}
        files={files}
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
    />
  );
}


import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PortalWizard } from "@/features/portal/components/portal-wizard";
// Removed unused imports

export default async function RoomPage({ params }: { params: { token: string } }) {
  const supabase = await createClient();
  const { token } = await params;

  // Parallel: case data + org branding
  // get_case_validation not in generated types — use `any` cast for the branding call
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

  // Safe cast
  const result = resultData as any;
  const caseData = result.case;
  const clientName = result.client_name;
  const files = result.files || [];

  // Extract org branding (non-critical — fallback gracefully)
  const brandingRow = brandingResult.data?.[0];
  const orgName: string | undefined = brandingRow?.org_name;
  const orgLogoUrl: string | undefined = brandingRow?.org_logo_url;

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


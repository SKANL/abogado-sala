import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PortalWizard } from "@/features/portal/components/portal-wizard";
// Removed unused imports

export default async function RoomPage({ params }: { params: { token: string } }) {
  const supabase = await createClient();
  const { token } = await params;

  // Use the RPC or direct query.
  const { data: resultData, error } = await supabase.rpc("get_case_by_token", {
      p_token: token
  });

  if (error || !resultData) {
      console.error("Portal Error:", error);
      notFound();
  }

  // Safe cast
  const result = resultData as any;
  const caseData = result.case;
  const clientName = result.client_name;
  const files = result.files || [];

  return (
    <PortalWizard 
      token={token}
      initialCaseData={caseData}
      clientName={clientName}
      files={files}
    />
  );
}

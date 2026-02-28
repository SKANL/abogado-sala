import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AcceptInvitationForm } from "@/features/org/components/accept-invitation-form";

interface InvitationPageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // Verify invitation is still pending and valid
  const { data: rows, error } = await supabase
    .rpc("get_invitation_by_token", { p_token: token });

  if (error || !rows || rows.length === 0) {
    redirect("/login?error=invitacion-invalida");
  }

  const invitation = rows[0];

  return (
    <AcceptInvitationForm
      token={token}
      email={invitation.email}
      orgName={invitation.org_name}
      role={invitation.role}
    />
  );
}

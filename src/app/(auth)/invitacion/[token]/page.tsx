import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AcceptInvitationForm } from "@/features/org/components/accept-invitation-form";

interface InvitationPageProps {
  params: Promise<{ token: string }>;
}

async function InvitationContent({ token }: { token: string }) {
  const supabase = await createClient();

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

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params;
  return (
    <Suspense>
      <InvitationContent token={token} />
    </Suspense>
  );
}

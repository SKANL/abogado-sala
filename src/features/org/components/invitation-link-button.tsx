"use client";

import { CopyableField } from "@/components/ui/copyable-field";

interface InvitationLinkButtonProps {
  token: string;
}

/**
 * Button that copies the full invitation link to clipboard.
 * Rendered server-side in the equipo page, uses window.location.origin on client.
 */
export function InvitationLinkButton({ token }: InvitationLinkButtonProps) {
  const link = typeof window !== "undefined" 
    ? `${window.location.origin}/invitacion/${token}` 
    : `/invitacion/${token}`;

  return (
    <CopyableField
      value={link}
      label="Copiar link"
      variant="button"
      tooltip="Copiar enlace de invitación"
    />
  );
}

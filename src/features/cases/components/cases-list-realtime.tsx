"use client";

import { useRealtimeSmartSync } from "@/hooks/use-realtime-smart-sync";

interface CasesListRealtimeProps {
  orgId: string;
}

/**
 * Invisible client component that subscribes to Postgres Changes on the
 * `cases` table for the current org. When a case is inserted, updated or
 * deleted by any team member, `router.refresh()` is called (no queryKey →
 * Server Component re-render branch) so the cases list stays live without a
 * manual browser reload.
 */
export function CasesListRealtime({ orgId }: CasesListRealtimeProps) {
  useRealtimeSmartSync({
    channelName: `cases-list-${orgId}`,
    table: "cases",
    event: "*",
    filter: `org_id=eq.${orgId}`,
    debounceMs: 1500,
  });

  return null;
}

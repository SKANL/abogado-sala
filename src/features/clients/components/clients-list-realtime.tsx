"use client";

import { useRealtimeSmartSync } from "@/hooks/use-realtime-smart-sync";

interface ClientsListRealtimeProps {
  orgId: string;
}

/**
 * Invisible client component that subscribes to Postgres Changes on the
 * `clients` table for the current org. When a client is inserted, updated or
 * deleted by any team member, `router.refresh()` is called so the clients list
 * stays live without a manual browser reload.
 */
export function ClientsListRealtime({ orgId }: ClientsListRealtimeProps) {
  useRealtimeSmartSync({
    channelName: `clients-list-${orgId}`,
    table: "clients",
    event: "*",
    filter: `org_id=eq.${orgId}`,
    debounceMs: 1500,
  });

  return null;
}

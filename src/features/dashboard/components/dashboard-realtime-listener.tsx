"use client";

import { useRealtimeSmartSync } from "@/hooks/use-realtime-smart-sync";

interface DashboardRealtimeListenerProps {
  userId: string;
  orgId?: string;
}

export function DashboardRealtimeListener({ userId, orgId }: DashboardRealtimeListenerProps) {
  // 1. Listen for new/updated cases in the Org
  // RLS will ensure we only receive events for cases we have access to (e.g. if we are constrained to specific clients).
  // Filtering by org_id reduces noise if we had multiple tenants broadcasting (though RLS handles that too).
  // It's a safer, more robust filter than filtering by a column that might not be on the table payload (like assigned_lawyer_id).
  useRealtimeSmartSync({
    channelName: 'dashboard-cases',
    table: 'cases',
    event: '*', // Insert, Update, Delete
    filter: orgId ? `org_id=eq.${orgId}` : undefined,
    queryKey: ['dashboard-stats'], 
  });

  return null; 
}

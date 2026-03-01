"use client";

import { useRealtimeSmartSync } from "@/hooks/use-realtime-smart-sync";

interface CaseRealtimeListenerProps {
  caseId: string;
}

export function CaseRealtimeListener({ caseId }: CaseRealtimeListenerProps) {

  // Files: debounced refresh (Server Component data, no React Query cache)
  useRealtimeSmartSync({
    channelName: `case-${caseId}-files`,
    table: 'case_files',
    filter: `case_id=eq.${caseId}`,
    event: '*',
    debounceMs: 1000, // batch rapid multi-file changes
  });

  // Case status: debounced refresh (Server Component data)
  useRealtimeSmartSync({
    channelName: `case-${caseId}-status`,
    table: 'cases',
    filter: `id=eq.${caseId}`,
    event: 'UPDATE',
    debounceMs: 1500, // status changes are rare, generous debounce
  });

  return null;
}

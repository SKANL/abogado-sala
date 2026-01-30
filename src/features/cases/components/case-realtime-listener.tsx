"use client";

import { useRealtimeSmartSync } from "@/hooks/use-realtime-smart-sync";
import { useEffect, useState } from "react";

interface CaseRealtimeListenerProps {
  caseId: string;
}

export function CaseRealtimeListener({ caseId }: CaseRealtimeListenerProps) {
  
  // 1. Listen for new files uploaded to this case
  useRealtimeSmartSync({
    channelName: `case-${caseId}-files`,
    table: 'case_files',
    filter: `case_id=eq.${caseId}`,
    event: '*',
    queryKey: ['case-files', caseId], // Optional: if we had a client query. 
    // Defaults to router.refresh() which updates the Server Component list.
  });

  // 2. Listen for status changes on the case itself
  useRealtimeSmartSync({
     channelName: `case-${caseId}-status`,
     table: 'cases',
     filter: `id=eq.${caseId}`,
     event: 'UPDATE', 
     // We only care about updates here, INSERT happened long ago.
     debounceMs: 500
  });

  return null;
}

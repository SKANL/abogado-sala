"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface RealtimeConfig {
  channelName: string;
  table: string;
  filter?: string; // e.g. "user_id=eq.123"
  queryKey?: unknown[]; // Query key to invalidate
  debounceMs?: number; // Default 500ms
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  onPayload?: (payload: Record<string, unknown>) => void; // Optional custom handler for delta patching
}

/**
 * useRealtimeSmartSync
 * 
 * Implements the "Professional Hybrid Strategy":
 * 1. Subscribes to Postgres Changes.
 * 2. On change, debounces an invalidation of the provided QueryKey.
 * 3. Optionally calls a callback for optimistic/delta updates.
 */
export function useRealtimeSmartSync({
  channelName,
  table,
  filter,
  queryKey,
  debounceMs = 500,
  event = "*",
  schema = "public",
  onPayload
}: RealtimeConfig) {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Stable client ref — createClient() must NOT be called on every render,
  // otherwise supabase ends up in the useEffect dep array and causes
  // channel teardown + recreate on every render → AbortError loop.
  const supabaseRef = useRef(createClient());

  // Stable refs for callbacks/values that change every render to avoid
  // triggering the effect when they haven't semantically changed.
  const timeoutRef   = useRef<NodeJS.Timeout | null>(null);
  const onPayloadRef = useRef<((payload: Record<string, unknown>) => void) | undefined>(onPayload);
  const queryKeyRef  = useRef(queryKey);
  const debounceRef  = useRef(debounceMs);

  // Keep refs in sync without re-running the effect
  useEffect(() => { onPayloadRef.current = onPayload; });
  useEffect(() => { queryKeyRef.current  = queryKey;  });
  useEffect(() => { debounceRef.current  = debounceMs; });

  useEffect(() => {
    const supabase  = supabaseRef.current;
    const channelId = `${channelName}-${table}-${filter || 'all'}`;

    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event, schema, table, filter },
        (payload) => {
          if (onPayloadRef.current) {
            onPayloadRef.current(payload);
          }

          if (queryKeyRef.current) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            timeoutRef.current = setTimeout(() => {
              console.log(`[Realtime] Invalidating due to ${payload.eventType} on ${table}`);
              queryClient.invalidateQueries({ queryKey: queryKeyRef.current! });
              // router.refresh() is NOT called here — React Query cache invalidation
              // is sufficient when a queryKey is provided. router.refresh() forces
              // a full server re-render + DB re-fetch for every realtime event, which
              // defeats the purpose of client-side caching.
            }, debounceRef.current);
          } else {
            // No queryKey → data lives only in Server Components, so we need
            // to tell Next.js to re-render the page to pick up DB changes.
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              console.log(`[Realtime] Server refresh due to ${payload.eventType} on ${table}`);
              router.refresh();
            }, debounceRef.current);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] Connected to ${channelId}`);
        }
      });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  // Only re-run if the channel identity changes (which is intentional).
  // Callbacks and debounce are handled via refs above.
  }, [channelName, table, filter, event, schema, queryClient, router]);
}

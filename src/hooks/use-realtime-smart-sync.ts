"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface RealtimeConfig {
  channelName: string;
  table: string;
  filter?: string; // e.g. "user_id=eq.123"
  queryKey?: unknown[]; // Query key to invalidate
  debounceMs?: number; // Default 500ms
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  onPayload?: (payload: any) => void; // Optional custom handler for delta patching
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
  const supabase = createClient();
  
  // Refs to handle debounce across renders
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Unique channel per configuration to avoid collisions
    const channelId = `${channelName}-${table}-${filter || 'all'}`;
    
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event,
          schema,
          table,
          filter,
        },
        (payload) => {
          // 1. Run custom handler (Delta Patching)
          if (onPayload) {
            onPayload(payload);
          }

          // 2. Debounced Invalidation (Smart Sync)
          if (queryKey) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
              console.log(`[Realtime] Invalidating ${queryKey} due to ${payload.eventType} on ${table}`);
              queryClient.invalidateQueries({ queryKey });
              router.refresh(); // Also refresh server components if needed
            }, debounceMs);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
           console.log(`[Realtime] Connected to ${channelId}`);
        }
      });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [channelName, table, filter, queryKey, debounceMs, event, schema, onPayload, queryClient, router, supabase]);
}

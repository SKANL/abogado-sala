"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRealtimeSmartSync } from "./use-realtime-smart-sync";
import { useEffect, useState } from "react";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  created_at: string;
  metadata?: { link?: string };
}

export function useNotifications() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Get User ID safely (client-side)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, [supabase]);

  // 2. Fetch with React Query (SSOT)
  const { data: notifications = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!userId,
  });

  // 3. Smart Sync (Realtime -> Invalidate)
  useRealtimeSmartSync({
    channelName: 'notifications-channel',
    table: 'notifications',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    queryKey: ['notifications', userId],
    onPayload: (payload) => {
      if (payload.eventType === 'INSERT') {
        const newNotif = payload.new as Notification;
        toast(newNotif.title, { description: newNotif.message });
      }
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // Actions
  const markAsRead = async (id: string) => {
    // Optimistic update via patching cache could be added here, 
    // but meant for "Hybrid Strategy", invalidation is safer for marking read if logic is simple.
    // For now we'll do simple async update + refetch triggers.
    
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    refetch(); // Ensure UI sync
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    refetch();
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  };
}

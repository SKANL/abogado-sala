"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();
  const router = useRouter();

  // Fetch initial
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching notifications", error);
        return;
      }

      setNotifications(data as Notification[]);
      setLoading(false);
    };

    fetchNotifications();
  }, [supabase]);

  // Realtime
  useEffect(() => {
    const setupRealtime = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;

       const channel = supabase
         .channel('user-notifications')
         .on(
           'postgres_changes',
           {
             event: 'INSERT',
             schema: 'public',
             table: 'notifications',
             filter: `user_id=eq.${user.id}`
           },
           (payload) => {
             const newNotif = payload.new as Notification;
             setNotifications(prev => [newNotif, ...prev]);
             toast(newNotif.title, { description: newNotif.message });
             router.refresh();
           }
         )
         .subscribe();

       return () => {
         supabase.removeChannel(channel);
       };
    };
    
    setupRealtime();
  }, [supabase, router]);

  // Derived state
  useEffect(() => {
      setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // Actions
  const markAsRead = async (id: string) => {
      // Optimistic
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      
      const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);
          
      if (error) {
          // Revert if failed (simplified for now actions usually succeed)
          console.error("Failed to mark as read");
      }
  };

  const markAllAsRead = async () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false);
      }
  };

  return {
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead
  };
}

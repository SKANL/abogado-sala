"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface RealtimeContextType {
    isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    // Stable ref — avoids adding supabase to useEffect dep arrays which causes loops
    const supabaseRef = useRef(createClient());

    // Resolve the current user ID on mount
    useEffect(() => {
        const supabase = supabaseRef.current;
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id ?? null);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        // Only subscribe once we have a confirmed userId
        if (!userId) return;

        const supabase = supabaseRef.current;
        const channel = supabase.channel(`notifications_${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const notification = payload.new as { title?: string; message?: string };
                    toast(notification.title || "Nueva notificación", {
                        description: notification.message || "Tienes un nuevo mensaje del sistema.",
                    });
                    // No router.refresh() needed — the notification bell badge is driven
                    // by useNotifications() (React Query) which will invalidate on its own
                    // realtime subscription. A full server re-render here is wasteful.
                }
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    setIsConnected(true);
                }
            });

        return () => {
            supabase.removeChannel(channel);
            setIsConnected(false);
        };
    }, [userId]);

    return (
        <RealtimeContext.Provider value={{ isConnected }}>
            {children}
        </RealtimeContext.Provider>
    );
}

export function useRealtime() {
    const context = useContext(RealtimeContext);
    if (context === undefined) {
        throw new Error("useRealtime must be used within a RealtimeProvider");
    }
    return context;
}

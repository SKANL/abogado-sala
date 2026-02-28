
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface RealtimeContextType {
    isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    // Resolve the current user ID on mount
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id ?? null);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id ?? null);
        });
        return () => subscription.unsubscribe();
    }, [supabase]);

    useEffect(() => {
        // Only subscribe once we have a confirmed userId to avoid leaking all-user notifications
        if (!userId) return;

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
                    router.refresh();
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
    }, [supabase, router, userId]);

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

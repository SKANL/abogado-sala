
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
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const channel = supabase.channel("global_notifications")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    // filter: `user_id=eq.${userId}` // In real app, filter by user
                },
                (payload) => {
                    console.log("New notification:", payload);
                    toast("Nueva notificación", {
                        description: "Tienes un nuevo mensaje del sistema."
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
        };
    }, [supabase, router]);

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

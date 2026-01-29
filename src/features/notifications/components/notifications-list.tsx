
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell } from "lucide-react";

export function NotificationsList() {
    // In strict production, this should fetch from an endpoint.
    // For now, we display a static empty state or a welcome message until the API is ready.
    // The RealtimeProvider handles the toasts, which is the "alive" part.
    const notifications = [
        { id: 1, title: "Bienvenido", message: "Sistema listo para producción.", time: "Ahora", read: false },
    ];

    return (
        <div className="w-80">
            <div className="flex items-center justify-between px-4 py-2 border-b">
                <h4 className="font-semibold text-sm">Notificaciones</h4>
                {/* Pending: Mark all as read button */}
            </div>
            {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                    No tienes notificaciones.
                </div>
            ) : (
                <ScrollArea className="h-[300px]">
                    <div className="grid">
                        {notifications.map((n) => (
                            <div key={n.id} className={`px-4 py-3 border-b hover:bg-muted/50 cursor-pointer ${!n.read ? 'bg-muted/20' : ''}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <h5 className="text-sm font-medium">{n.title}</h5>
                                    <span className="text-[10px] text-muted-foreground">{n.time}</span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {n.message}
                                </p>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}

export function NotificationTrigger() {
    return (
        <div className="relative cursor-pointer">
            <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        </div>
    );
}

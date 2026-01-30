"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function NotificationsList() {
    const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
    const router = useRouter();

    const handleNotificationClick = (n: any) => {
        if (!n.read) markAsRead(n.id);
        if (n.metadata?.link) {
            if (n.metadata.external || n.metadata.link.startsWith('http')) {
                window.open(n.metadata.link, '_blank');
            } else {
                router.push(n.metadata.link);
            }
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-xs text-muted-foreground">Cargando...</div>;
    }

    return (
        <div className="w-80">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
                <h4 className="font-semibold text-sm">Notificaciones</h4>
                {notifications.some(n => !n.read) && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => markAllAsRead()}
                        title="Marcar todas como leídas"
                    >
                        <CheckCheck className="h-3 w-3" />
                    </Button>
                )}
            </div>
            {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                    No tienes notificaciones.
                </div>
            ) : (
                <ScrollArea className="h-[300px]">
                    <div className="grid">
                        {notifications.map((n) => (
                            <div 
                                key={n.id} 
                                onClick={() => handleNotificationClick(n)}
                                className={cn(
                                    "px-4 py-3 border-b hover:bg-muted/50 transition-colors relative",
                                    !n.read ? "bg-blue-50/50 dark:bg-blue-900/10" : "opacity-70",
                                    n.metadata?.link ? "cursor-pointer" : "cursor-default"
                                )}
                            >
                                {!n.read && (
                                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                                )}
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <h5 className={cn("text-sm", !n.read ? "font-semibold" : "font-medium")}>
                                        {n.title}
                                    </h5>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                        {formatDistanceToNow(new Date(n.created_at), { locale: es })}
                                    </span>
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
    const { unreadCount } = useNotifications();

    return (
        <div className="relative cursor-pointer p-1">
            <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </div>
    );
}

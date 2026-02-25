"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NotificationsList, NotificationTrigger } from "./notifications-list";

export function NotificationsSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button aria-label="Notificaciones" className="relative inline-flex outline-none transition-transform hover:scale-105">
            <NotificationTrigger />
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 border-l flex flex-col" aria-describedby="Panel de notificaciones de la cuenta">
        <SheetHeader className="p-4 border-b bg-muted/30">
          <SheetTitle>Centro de Notificaciones</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
            <NotificationsList isSheet />
        </div>
      </SheetContent>
    </Sheet>
  );
}

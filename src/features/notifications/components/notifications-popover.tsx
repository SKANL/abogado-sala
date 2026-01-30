"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationsList, NotificationTrigger } from "./notifications-list";

export function NotificationsPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative inline-flex">
            <NotificationTrigger />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <NotificationsList />
      </PopoverContent>
    </Popover>
  );
}

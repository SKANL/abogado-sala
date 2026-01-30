import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { OrgFetcherWrapper } from "@/components/layout/dashboard-wrapper/org-fetcher";
import { NotificationsPopover } from "@/features/notifications/components/notifications-popover";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrgFetcherWrapper>
        <SidebarProvider>
        <AppSidebar />
        <main className="w-full">
            <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                    <SidebarTrigger />
                    <span className="font-semibold">Dashboard</span>
                </div>
                <div className="flex items-center gap-4">
                    <NotificationsPopover />
                </div>
            </div>
            <div className="p-4 md:p-6 lg:p-8">
                {children}
            </div>
        </main>
        </SidebarProvider>
    </OrgFetcherWrapper>
  );
}

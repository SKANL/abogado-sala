import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { OrgFetcherWrapper } from "@/components/layout/dashboard-wrapper/org-fetcher";
import { NotificationsPopover } from "@/features/notifications/components/notifications-popover";
import { DynamicBreadcrumb } from "@/components/layout/dynamic-breadcrumb";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrgFetcherWrapper>
        <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 overflow-hidden w-full flex flex-col">
            <div className="flex h-14 items-center justify-between border-b px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <SidebarTrigger />
                    <DynamicBreadcrumb />
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

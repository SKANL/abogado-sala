import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { OrgFetcherWrapper } from "@/components/layout/dashboard-wrapper/org-fetcher";
import { NotificationsSheet } from "@/features/notifications/components/notifications-sheet";
import { DynamicBreadcrumb } from "@/components/layout/dynamic-breadcrumb";
import { CommandMenu } from "@/components/layout/command-menu";
import { MobileFab } from "@/components/layout/mobile-fab";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrgFetcherWrapper>
        <SidebarProvider className="h-svh overflow-hidden">
        <AppSidebar />
        <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden relative">
            <div className="flex h-14 items-center justify-between border-b px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <SidebarTrigger />
                    <DynamicBreadcrumb />
                </div>
                <div className="flex items-center gap-4">
                    <CommandMenu />
                    <NotificationsSheet />
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
                {children}
            </div>
            <MobileFab />
        </main>
        </SidebarProvider>
    </OrgFetcherWrapper>
  );
}

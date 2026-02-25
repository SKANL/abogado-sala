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
        <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 overflow-hidden w-full flex flex-col relative">
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
            <div className="p-4 md:p-6 lg:p-8 h-full overflow-y-auto">
                {children}
            </div>
            <MobileFab />
        </main>
        </SidebarProvider>
    </OrgFetcherWrapper>
  );
}

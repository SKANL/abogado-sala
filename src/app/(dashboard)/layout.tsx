import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { OrgFetcherWrapper } from "@/components/layout/dashboard-wrapper/org-fetcher";

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
            <div className="flex items-center gap-2 border-b p-4">
                <SidebarTrigger />
                <span className="font-semibold">Dashboard</span>
            </div>
            <div className="p-4 md:p-6 lg:p-8">
                {children}
            </div>
        </main>
        </SidebarProvider>
    </OrgFetcherWrapper>
  );
}

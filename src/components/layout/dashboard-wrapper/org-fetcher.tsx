
import { getOrganizationDetailsAction } from "@/features/org/actions-read";
import { OrganizationProvider } from "@/components/providers/organization-provider";
import { redirect } from "next/navigation";

export async function OrgFetcherWrapper({ children }: { children: React.ReactNode }) {
    const result = await getOrganizationDetailsAction();

    if (!result.success) {
        // Fallback for edge cases (should be handled by middleware, but safety net)
        if (result.code === 'AUTH_UNAUTHORIZED') {
            redirect("/login");
        }
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-red-500">Error cargando organización: {result.error}</p>
            </div>
        );
    }

    return (
        <OrganizationProvider organization={result.data}>
            {children}
        </OrganizationProvider>
    );
}

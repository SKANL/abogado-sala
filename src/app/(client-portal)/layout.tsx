import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import { ClientPortalLogoutButton } from "@/features/portal/components/client-portal-logout-button";

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/mi-portal/login");
  }

  const role = user.app_metadata?.role as string | undefined;
  if (role !== "client") {
    // Staff trying to access client portal — redirect to dashboard
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Simple client portal header */}
      <header className="bg-background border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/mi-portal" className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4 text-primary" />
            <span>Portal de Cliente</span>
          </Link>
          <ClientPortalLogoutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

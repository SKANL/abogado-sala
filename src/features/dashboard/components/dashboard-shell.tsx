
import { createClient } from "@/lib/supabase/server";
import { OwnerDashboard } from "./owner-dashboard";
import { LawyerDashboard } from "./lawyer-dashboard";
import { redirect } from "next/navigation";

export async function DashboardShell() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth");
  }

  // Fallback to metadata role or query profile if needed
  // backend-contracts.md says custom claims should be in session/token
  const role = user.app_metadata?.role || "member"; 
  const orgId = user.app_metadata?.org_id;

  if (!orgId) {
      // Handle edge case: User has no org (e.g. invite pending acceptance or broken state)
      return <div className="p-4">Error: No Organization Context Found. Contact Support.</div>;
  }

  const isOwner = role === "admin" || role === "owner"; // 'admin' usually implies owner/admin in this context based on schema

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Hola, {user.user_metadata?.full_name?.split(" ")[0] || "Abogado"}
        </h1>
        <p className="text-muted-foreground">
          {isOwner ? "Vista General del Despacho" : "Tu Espacio de Trabajo"}
        </p>
      </div>

      {isOwner ? (
        <OwnerDashboard orgId={orgId} userId={user.id} />
      ) : (
        <LawyerDashboard userId={user.id} />
      )}
    </div>
  );
}

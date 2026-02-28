
import { createClient } from "@/lib/supabase/server";
import { OwnerDashboard } from "./owner-dashboard";
import { LawyerDashboard } from "./lawyer-dashboard";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
      return (
        <div className="flex items-center justify-center p-8">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Sin contexto de organización</AlertTitle>
            <AlertDescription>
              Tu cuenta no está asociada a ninguna organización. Contacta al soporte o acepta la invitación pendiente.
            </AlertDescription>
          </Alert>
        </div>
      );
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

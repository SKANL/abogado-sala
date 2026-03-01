import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/features/auth/components/profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile from DB — source of truth for full_name and avatar_url
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Mi Perfil</h3>
        <p className="text-sm text-muted-foreground">
          Información personal y de contacto.
        </p>
      </div>
      <ProfileForm
        userId={user.id}
        fullName={profile?.full_name ?? user.user_metadata?.full_name ?? null}
        email={user.email ?? ""}
        avatarUrl={profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null}
      />
    </div>
  );
}

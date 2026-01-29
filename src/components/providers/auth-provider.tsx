"use client";

import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  org: {
    id: string;
    name: string;
    slug: string;
    plan_tier: string;
    primary_color: string | null;
    logo_url: string | null;
  } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  org: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<AuthContextType['org']>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
         // Fetch Org details if user is logged in
         const orgId = session.user.app_metadata?.org_id;
         if (orgId) {
             const { data } = await supabase.from("organizations").select("*").eq("id", orgId).single();
             if (data) setOrg(data);
         }
      } else {
          setOrg(null);
      }

      setLoading(false);

      if (event === "SIGNED_OUT") {
        router.push("/login"); // or router.refresh()
        router.refresh();
      } else if (event === "SIGNED_IN") {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, org, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};

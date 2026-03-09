import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles the PKCE code exchange for Supabase invite emails sent to clients.
 * After exchange, redirects to /portal/activar (first login) or /mi-portal (returning).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/portal/activar";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // If something went wrong, redirect to the portal login with an error
  return NextResponse.redirect(new URL("/mi-portal/login?error=activacion-fallida", origin));
}

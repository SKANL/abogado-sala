import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route Protection Logic
  const path = request.nextUrl.pathname;

  // 1. Dashboard Protection — ALL authenticated sections
  const protectedPrefixes = [
    "/dashboard",
    "/clientes",
    "/casos",
    "/equipo",
    "/plantillas",
    "/ajustes",
    "/perfil",
    "/configuracion",
    "/facturacion",
  ];
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Auth Page Redirection (if already logged in)
  if (path === "/login" || path === "/registro") {
      if (user) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
      }
  }

  // 3. Role-based Protection — Owner/Admin only routes
  // These routes are not useful (and can be confusing) for regular lawyer members.
  // Roles are read from the JWT app_metadata — no extra DB round-trip needed.
  // Future roles (paralegal, secretary, accountant) should be added to the member
  // list below until they receive explicit access to specific owner routes.
  const ownerOnlyPrefixes = ["/equipo", "/plantillas", "/ajustes", "/configuracion"];
  const isOwnerOnly = ownerOnlyPrefixes.some((p) => path.startsWith(p));

  if (isOwnerOnly && user) {
    const role = user.app_metadata?.role as string | undefined;
    // Only "owner" and "admin" can access these routes.
    // "member" (lawyers and future employee roles) are redirected to their dashboard.
    if (role === "member") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

// ─── Invite ───────────────────────────────────────────────────────────────────

/**
 * Send a Supabase invite email to a client so they can create a portal account.
 * Called from the dashboard case or client pages.
 */
export async function inviteClientToPortalAction(clientId: string): Promise<Result<void>> {
  if (!clientId) {
    return { success: false, error: "ID de cliente requerido", code: ERROR_CODES.VAL_INVALID_INPUT };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.app_metadata?.org_id as string | undefined;
  const role = user?.app_metadata?.role as string | undefined;

  if (!orgId || !user) {
    return { success: false, error: "Sin acceso", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }
  if (role !== "owner" && role !== "admin") {
    return { success: false, error: "Solo admin/owner puede enviar invitaciones al portal", code: ERROR_CODES.AUTH_FORBIDDEN };
  }

  // Fetch client email & existing account state
  // auth_user_id was added after type generation – cast the client to bypass strict typing
  type ClientRow = { id: string; full_name: string | null; email: string | null; org_id: string; auth_user_id: string | null };
  const adminClient = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: client, error: clientError } = await (adminClient as any)
    .from("clients")
    .select("id, full_name, email, org_id, auth_user_id")
    .eq("id", clientId)
    .eq("org_id", orgId)
    .single() as { data: ClientRow | null; error: unknown };

  if (clientError || !client) {
    return { success: false, error: "Cliente no encontrado", code: ERROR_CODES.AUTH_FORBIDDEN };
  }
  if (!client.email) {
    return { success: false, error: "El cliente no tiene email registrado. Agrégalo primero.", code: ERROR_CODES.VAL_INVALID_INPUT };
  }
  if (client.auth_user_id) {
    return { success: false, error: "Este cliente ya tiene una cuenta activa en el portal.", code: ERROR_CODES.VAL_DUPLICATE_SLUG };
  }

  if (!(process.env.NEXT_PUBLIC_APP_URL)) {
    return { success: false, error: "Configuración de URL de aplicación faltante", code: ERROR_CODES.SYS_INTERNAL_ERROR };
  }

  // Use service role to invite (inviteUserByEmail requires service key)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/portal-callback`;

  const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    client.email,
    {
      data: {
        client_id: client.id,
        org_id: client.org_id,
        full_name: client.full_name,
        invited_as: "client",
      },
      redirectTo,
    }
  );

  if (inviteError) {
    // If user already exists but unlinked, fall back gracefully
    if (inviteError.message?.includes("already been registered")) {
      return {
        success: false,
        error: "Ya existe una cuenta de Supabase con ese email. El cliente puede iniciar sesión directamente en /mi-portal/login.",
        code: ERROR_CODES.VAL_DUPLICATE_SLUG,
      };
    }
    return handleError(inviteError);
  }

  return { success: true, data: undefined };
}

// ─── Activate ─────────────────────────────────────────────────────────────────

/**
 * After the client clicks the invite email and lands on /portal/activar,
 * this action links their new auth.users entry to the correct clients row
 * and stamps the JWT app_metadata with role='client'.
 *
 * Must be called while the user already has a session (post-PKCE exchange).
 */
export async function activateClientAccountAction(): Promise<
  Result<{ clientId: string; orgId: string }>
> {
  const supabase = await createClient();
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();

  if (sessionError || !user) {
    return { success: false, error: "Sesión inválida", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  // Read client_id & org_id written into user_metadata during invite
  const clientId = user.user_metadata?.client_id as string | undefined;
  const orgId = user.user_metadata?.org_id as string | undefined;

  if (!clientId || !orgId) {
    return {
      success: false,
      error: "Enlace de activación inválido. Pide al despacho que te envíe una nueva invitación.",
      code: ERROR_CODES.VAL_INVALID_INPUT,
    };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Verify the client row exists and belongs to the org
  const { data: clientRow } = await serviceClient
    .from("clients")
    .select("id, auth_user_id")
    .eq("id", clientId)
    .eq("org_id", orgId)
    .single();

  if (!clientRow) {
    return { success: false, error: "Datos del cliente no encontrados", code: ERROR_CODES.AUTH_FORBIDDEN };
  }

  // 2. Stamp app_metadata (JWT claims for RLS)
  const { error: metaError } = await serviceClient.auth.admin.updateUserById(user.id, {
    app_metadata: {
      role: "client",
      client_id: clientId,
      org_id: orgId,
    },
  });

  if (metaError) return handleError(metaError);

  // 3. Link auth user → clients row
  const { error: linkError } = await serviceClient
    .from("clients")
    .update({ auth_user_id: user.id } as Record<string, unknown>)
    .eq("id", clientId)
    .eq("org_id", orgId);

  if (linkError) return handleError(linkError);

  revalidateTag(CACHE_TAGS.clients, {});

  return { success: true, data: { clientId, orgId } };
}

// ─── Portal data queries (authenticated client) ───────────────────────────────

/**
 * Fetch all cases for the currently-authenticated client.
 * RLS enforces that only their own cases are returned.
 */
export async function getClientPortalCasesAction(): Promise<
  Result<Array<{
    id: string;
    token: string;
    status: string;
    current_step_index: number | null;
    expires_at: string | null;
    created_at: string;
    template_name: string | null;
    files_count: number;
    files_pending: number;
  }>>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cases")
    .select("id, token, status, current_step_index, expires_at, created_at, template_snapshot, files:case_files(id, status)")
    .order("created_at", { ascending: false });

  if (error) return handleError(error);

  const cases = (data ?? []).map((c) => {
    const files = (c.files ?? []) as Array<{ id: string; status: string }>;
    return {
      id: c.id,
      token: c.token,
      status: c.status,
      current_step_index: c.current_step_index,
      expires_at: c.expires_at,
      created_at: c.created_at,
      template_name: (c.template_snapshot as Record<string, unknown>)?.name as string ?? null,
      files_count: files.length,
      files_pending: files.filter((f) => f.status === "pending" || f.status === "rejected").length,
    };
  });

  return { success: true, data: cases };
}

/**
 * Fetch a single case + files + updates for the authenticated client portal.
 * RLS enforces ownership — no explicit filter needed.
 */
export async function getClientPortalCaseAction(caseId: string): Promise<
  Result<{
    id: string;
    token: string;
    status: string;
    current_step_index: number | null;
    expires_at: string | null;
    files: Array<{
      id: string;
      category: string;
      description: string | null;
      file_key: string | null;
      file_size: number;
      status: string;
      review_note: string | null;
    }>;
    updates: Array<{
      id: string;
      title: string;
      body: string | null;
      type: string;
      created_at: string;
    }>;
  }>
> {
  const supabase = await createClient();

  const [caseResult, updatesResult] = await Promise.all([
    supabase
      .from("cases")
      .select("id, token, status, current_step_index, expires_at, files:case_files(id, category, description, file_key, file_size, status, review_note)")
      .eq("id", caseId)
      .single(),
    supabase
      .from("case_updates")
      .select("id, title, body, type, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false }),
  ]);

  if (caseResult.error || !caseResult.data) {
    return { success: false, error: "Expediente no encontrado", code: ERROR_CODES.AUTH_FORBIDDEN };
  }

  return {
    success: true,
    data: {
      ...caseResult.data,
      files: (caseResult.data.files ?? []) as Array<{
        id: string;
        category: string;
        description: string | null;
        file_key: string | null;
        file_size: number;
        status: string;
        review_note: string | null;
      }>,
      updates: (updatesResult.data ?? []).map((u) => ({
        id: u.id,
        title: u.title,
        body: (u as { body?: string | null }).body ?? null,
        type: (u as { type?: string }).type ?? "info",
        created_at: u.created_at ?? new Date().toISOString(),
      })),
    },
  };
}

// ─── Send magic-link login for existing clients ───────────────────────────────

export async function sendClientMagicLinkAction(email: string): Promise<Result<void>> {
  if (!email?.trim()) {
    return { success: false, error: "Email requerido", code: ERROR_CODES.VAL_INVALID_INPUT };
  }

  const supabase = await createClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/portal-callback?next=/mi-portal`;

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
  });

  if (error) {
    // Avoid exposing "user not found" to prevent email enumeration
    if (error.message?.toLowerCase().includes("user not found") ||
        error.message?.toLowerCase().includes("not registered")) {
      // Return success anyway — don't leak whether the email is registered
      return { success: true, data: undefined };
    }
    return handleError(error);
  }

  return { success: true, data: undefined };
}

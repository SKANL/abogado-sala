"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { inviteMemberSchema, updateOrganizationSchema, revokeInvitationSchema } from "@/lib/schemas/backend-contracts";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function inviteMemberAction(
  prevState: any,
  formData: FormData
): Promise<Result<any>> {
  const rawData = Object.fromEntries(formData);
  const parse = inviteMemberSchema.safeParse(rawData);

  if (!parse.success) {
    return {
      success: false,
      error: "Datos inválidos",
      code: ERROR_CODES.VAL_INVALID_INPUT,
      validationErrors: parse.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const org_id = user?.app_metadata?.org_id;

  if (!org_id) {
     return { success: false, error: "No org_id found", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");

  const { error, data: invitation } = await supabase
    .from("invitations")
    .insert({
      email: parse.data.email,
      role: parse.data.role,
      org_id: org_id,
      token: token,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select()
    .single();

  if (error) {
    return handleError(error);
  }

  revalidatePath("/equipo");
  return { success: true, data: invitation };
}

export async function updateOrganizationAction(
  prevState: any,
  formData: FormData
): Promise<Result<any>> {
    const rawData = Object.fromEntries(formData);
    const parse = updateOrganizationSchema.safeParse(rawData);

    if (!parse.success) {
        return {
            success: false,
            error: "Datos inválidos",
            code: ERROR_CODES.VAL_INVALID_INPUT,
            validationErrors: parse.error.flatten().fieldErrors,
        };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const org_id = user?.app_metadata?.org_id;
    
    if (!org_id) {
         return { success: false, error: "No org_id found", code: ERROR_CODES.AUTH_UNAUTHORIZED };
    }

    const { error, data: updatedOrg } = await supabase
        .from("organizations")
        .update(parse.data)
        .eq("id", org_id) // RLS also enforces this
        .select()
        .single();

    if (error) {
        return handleError(error);
    }
    
    revalidatePath("/dashboard"); // Global update
    return { success: true, data: updatedOrg };
}

export async function removeMemberAction(userId: string): Promise<Result<void>> {
    if (!userId) {
        return { success: false, error: "ID requerido", code: ERROR_CODES.VAL_INVALID_INPUT };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("remove_org_member", { target_user_id: userId });

    if (error) {
        return handleError(error);
    }

    revalidatePath("/equipo");
    return { success: true, data: undefined };
}

export async function revokeInvitationAction(invitationId: string): Promise<Result<void>> {
    const parse = revokeInvitationSchema.safeParse({ id: invitationId });
    if (!parse.success) {
        return { success: false, error: "ID inválido", code: ERROR_CODES.VAL_INVALID_INPUT };
    }

    const supabase = await createClient();
    // Security: RLS ensures deletion only if org matches
    const { error } = await supabase.from("invitations").delete().eq("id", invitationId);

    if (error) {
        return handleError(error);
    }
    
    revalidatePath("/equipo");
    return { success: true, data: undefined };
}

/**
 * Acepta una invitación creando la cuenta de usuario.
 * El trigger handle_new_user asigna automáticamente org_id y role.
 */
export async function acceptInvitationAction(
  prevState: any,
  formData: FormData
): Promise<Result<{ requiresEmailConfirm: boolean }>> {
  const token = formData.get("token") as string;
  const full_name = (formData.get("full_name") as string)?.trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!full_name || full_name.length < 2) {
    return { success: false, error: "El nombre debe tener al menos 2 caracteres.", code: ERROR_CODES.VAL_INVALID_INPUT };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "La contraseña debe tener al menos 6 caracteres.", code: ERROR_CODES.VAL_INVALID_INPUT };
  }
  if (password !== confirmPassword) {
    return { success: false, error: "Las contraseñas no coinciden.", code: ERROR_CODES.VAL_INVALID_INPUT };
  }

  const supabase = await createClient();

  // Verify invitation token + get email securely from the DB
  const { data: invitationRows, error: invErr } = await supabase
    .rpc("get_invitation_by_token", { p_token: token });

  if (invErr || !invitationRows || invitationRows.length === 0) {
    return { success: false, error: "Invitación inválida o expirada.", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  const invitation = invitationRows[0];

  // Create auth user — handle_new_user trigger assigns org + role and marks invitation as accepted
  const { data, error } = await supabase.auth.signUp({
    email: invitation.email,
    password,
    options: {
      data: { full_name },
    },
  });

  if (error) {
    return handleError(error);
  }

  // If identities is empty, this email already has an account
  if (data.user && data.user.identities?.length === 0) {
    return { success: false, error: "Ya existe una cuenta con este correo electrónico.", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  const requiresEmailConfirm = !data.session;
  return { success: true, data: { requiresEmailConfirm } };
}

/**
 * Deletes the entire organisation and all associated data.
 * Restricted to the org 'owner' role via a SECURITY DEFINER DB function.
 *
 * Flow:
 *   1. Call `delete_organization` RPC — handles all DB rows and queues storage
 *      cleanup for case files.  Returns the member UUIDs it removed.
 *   2. Delete organization-assets (logo, etc.) directly from storage.
 *   3. Delete every member from auth.users via the admin API (profile rows
 *      were already cascade-deleted by the DB function).
 *   4. Sign out the current user — the client redirects to /login.
 */
export async function deleteOrganizationAction(): Promise<Result<void>> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.app_metadata?.org_id as string | undefined;

  if (!user || !orgId) {
    return { success: false, error: "No autenticado", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  // Must be the org owner (DB function enforces this too, but fail fast here)
  const role = user.app_metadata?.role as string | undefined;
  if (role !== "owner") {
    return { success: false, error: "Solo el propietario puede eliminar la organización", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  // ── 1. DB deletion via SECURITY DEFINER function ────────────────────────
  // Returns the list of member user UUIDs that were deleted from profiles.
  const { data: memberIds, error: rpcError } = await supabase
    .rpc("delete_organization", { p_org_id: orgId });

  if (rpcError) {
    return handleError(rpcError);
  }

  const userIds: string[] = (memberIds as { id?: string }[] | string[] | null ?? []).map(
    (row) => (typeof row === "string" ? row : (row as any).id ?? row)
  ).filter(Boolean);

  // ── 2. Clean up organization-assets storage (logo, etc.) ─────────────────
  try {
    const { data: storedFiles } = await admin.storage
      .from("organization-assets")
      .list(orgId);

    if (storedFiles && storedFiles.length > 0) {
      const paths = storedFiles.map((f) => `${orgId}/${f.name}`);
      await admin.storage.from("organization-assets").remove(paths);
    }
  } catch {
    // Non-fatal — storage cleanup failure doesn't block the response
  }

  // ── 3. Delete all member auth.users (profiles were already cascade-deleted) ─
  const deletionResults = await Promise.allSettled(
    userIds.map((uid) => admin.auth.admin.deleteUser(uid))
  );

  const failedDeletions = deletionResults
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => r.reason);

  if (failedDeletions.length > 0) {
    console.error("Some auth users could not be deleted:", failedDeletions);
    // Non-fatal: orphaned auth users without a profile/org are harmless
  }

  // ── 4. Sign out (client will redirect to /login) ─────────────────────────
  await supabase.auth.signOut();

  return { success: true, data: undefined };
}

"use server";

import { createClient } from "@/lib/supabase/server";
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

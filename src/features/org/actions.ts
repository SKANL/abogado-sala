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

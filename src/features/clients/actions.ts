"use server";

import { createClient } from "@/lib/supabase/server";
import { insertClientSchema, updateClientSchema } from "@/lib/schemas/backend-contracts";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result, ActionState } from "@/types";
import { revalidatePath, revalidateTag } from "next/cache";
import { checkOrgQuota } from "@/lib/services/quota-service";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { createNotification } from "@/lib/services/notification-service";

export async function createClientAction(
  prevState: ActionState,
  formData: FormData
): Promise<Result<unknown>> {
  const rawData = Object.fromEntries(formData);
  const parse = insertClientSchema.safeParse(rawData);

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
  const user_id = user?.id; // Needed for notification

  if (!org_id || !user_id) {
    return { success: false, error: "No org_id found", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  // 1. Enforce Quota
  const quota = await checkOrgQuota(supabase, org_id, 'clients');
  if (!quota.allowed) {
      return { 
          success: false, 
          error: quota.error || "Quota Exceeded", 
          code: quota.code || ERROR_CODES.BILLING_QUOTA_CLIENTS
      };
  }

  const { error, data: newClient } = await supabase
    .from("clients")
    .insert({
      ...parse.data,
      org_id // Inject org_id from session
    })
    .select()
    .single();

  if (error) {
    return handleError(error);
  }

  revalidatePath("/clientes");
  revalidateTag(CACHE_TAGS.clients, {});
  
  // 2. Notify
  await createNotification(supabase, {
      userId: user_id,
      orgId: org_id,
      title: "Nuevo Cliente",
      message: `Se ha creado el cliente ${newClient.full_name}`,
      type: "success",
      metadata: { link: `/clientes/${newClient.id}` }
  });

  return { success: true, data: newClient };
}

export async function updateClientAction(
  prevState: ActionState,
  formData: FormData
): Promise<Result<unknown>> {
  const rawData = Object.fromEntries(formData);
  const parse = updateClientSchema.safeParse(rawData);

  if (!parse.success) {
    return {
      success: false,
      error: "Datos inválidos",
      code: ERROR_CODES.VAL_INVALID_INPUT,
      validationErrors: parse.error.flatten().fieldErrors,
    };
  }

  const { id, ...updates } = parse.data;
  const supabase = await createClient();

  const { error, data: updatedClient } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return handleError(error);
  }

  revalidatePath("/clientes");
  revalidateTag(CACHE_TAGS.clients, {});
  revalidatePath(`/clientes/${id}`);
  revalidateTag(CACHE_TAGS.clientDetail(id), {});
  return { success: true, data: updatedClient };
}

export async function deleteClientAction(clientId: string): Promise<Result<void>> {
  if (!clientId) {
      return { success: false, error: "ID requerido", code: ERROR_CODES.VAL_INVALID_INPUT };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);

  if (error) {
    return handleError(error);
  }

  revalidatePath("/clientes");
  revalidateTag(CACHE_TAGS.clients, {});
  return { success: true, data: undefined };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
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

  // Notify the assigned lawyer when client ownership changes
  const newLawyerId = parse.data.assigned_lawyer_id;
  if (newLawyerId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const orgId = user?.app_metadata?.org_id as string | undefined;
      if (orgId) {
        const adminClient = createAdminClient();
        await createNotification(adminClient, {
          userId: newLawyerId,
          orgId,
          title: "Nuevo Cliente Asignado",
          message: `Se te ha asignado el cliente ${updatedClient.full_name}.`,
          type: "info",
          metadata: { client_id: id, link: `/clientes/${id}` },
        });
      }
    } catch (err) {
      console.error("Failed to send client assignment notification:", err);
    }
  }

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

// ─── Assign Client to Lawyer ─────────────────────────────────────────────────

export async function assignClientAction(
  clientId: string,
  assignedLawyerId: string | null
): Promise<Result<void>> {
  if (!clientId) return { success: false, error: "ID requerido", code: ERROR_CODES.VAL_INVALID_INPUT };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "No autorizado", code: ERROR_CODES.AUTH_UNAUTHORIZED };

  const role = user.app_metadata?.role as string | undefined;
  if (role === "member") {
    return { success: false, error: "Sin permiso para reasignar clientes", code: ERROR_CODES.AUTH_FORBIDDEN };
  }

  const adminClient = createAdminClient();

  // Fetch client for notifications and org check
  const { data: client } = await adminClient
    .from("clients")
    .select("full_name, assigned_lawyer_id, org_id")
    .eq("id", clientId)
    .single();

  const { error } = await supabase
    .from("clients")
    .update({ assigned_lawyer_id: assignedLawyerId })
    .eq("id", clientId);

  if (error) return handleError(error);

  const orgId = client?.org_id as string | undefined;
  const oldAssigneeId = client?.assigned_lawyer_id as string | null | undefined;

  const notifications: Promise<void>[] = [];

  if (assignedLawyerId && orgId) {
    notifications.push(
      createNotification(adminClient, {
        userId: assignedLawyerId,
        orgId,
        title: "Nuevo Cliente Asignado",
        message: `Se te ha asignado el cliente ${client?.full_name ?? "un cliente"}.`,
        type: "info",
        metadata: { client_id: clientId, link: `/clientes/${clientId}` },
      }).catch((err) => console.error("Client assign notification error:", err))
    );
  }

  if (oldAssigneeId && oldAssigneeId !== assignedLawyerId && orgId) {
    notifications.push(
      createNotification(adminClient, {
        userId: oldAssigneeId,
        orgId,
        title: "Cliente Reasignado",
        message: `El cliente ${client?.full_name ?? ""} ha sido reasignado a otro abogado.`,
        type: "warning",
        metadata: { client_id: clientId, link: `/clientes/${clientId}` },
      }).catch((err) => console.error("Client unassign notification error:", err))
    );
  }

  await Promise.all(notifications);

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  revalidateTag(CACHE_TAGS.clients, {});
  revalidateTag(CACHE_TAGS.clientDetail(clientId), {});
  return { success: true, data: undefined };
}

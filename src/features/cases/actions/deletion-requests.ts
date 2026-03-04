"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { createNotification } from "@/lib/services/notification-service";
import { revalidateTag } from "next/cache";
import { Result } from "@/types";
import { ERROR_CODES, handleError } from "@/lib/utils/error-handler";
import { CACHE_TAGS } from "@/lib/cache-tags";

// ─── Request Deletion ────────────────────────────────────────────────────────

export async function requestDeletionAction(
  entityType: "case" | "client",
  entityId: string,
  entityLabel: string,
  reason?: string
): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "No autorizado", code: ERROR_CODES.AUTH_UNAUTHORIZED };

  const org_id = user.app_metadata?.org_id as string | undefined;
  if (!org_id) return { success: false, error: "Sin organización", code: ERROR_CODES.AUTH_UNAUTHORIZED };

  // Insert the deletion request
  const { data, error } = await supabase
    .from("deletion_requests")
    .insert({
      org_id,
      requested_by: user.id,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      reason: reason ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return handleError(error);

  // Notify all org admins & owners
  try {
    const adminClient = createAdminClient();
    const { data: admins } = await adminClient
      .from("profiles")
      .select("id")
      .eq("org_id", org_id)
      .in("role", ["owner", "admin"]);

    const requesterName = user.user_metadata?.full_name ?? user.email ?? "Un miembro";
    const typeLabel = entityType === "case" ? "expediente" : "cliente";

    await Promise.all(
      (admins ?? []).map((admin) =>
        createNotification(adminClient, {
          userId: admin.id,
          orgId: org_id,
          title: "Solicitud de Eliminación",
          message: `${requesterName} ha solicitado eliminar el ${typeLabel} "${entityLabel}".`,
          type: "warning",
          metadata: {
            deletion_request_id: data.id,
            entity_type: entityType,
            entity_id: entityId,
            link: "/equipo",
          },
        })
      )
    );
  } catch (err) {
    console.error("Failed to send deletion request notifications:", err);
  }

  revalidateTag(CACHE_TAGS.deletionRequests, {});
  return { success: true, data: { id: data.id } };
}

// ─── Approve Deletion Request ────────────────────────────────────────────────

export async function approveDeletionRequestAction(
  requestId: string
): Promise<Result<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "No autorizado", code: ERROR_CODES.AUTH_UNAUTHORIZED };

  const role = user.app_metadata?.role as string | undefined;
  if (role !== "owner" && role !== "admin") {
    return { success: false, error: "Sin permisos", code: ERROR_CODES.AUTH_FORBIDDEN };
  }

  const org_id = user.app_metadata?.org_id as string;

  // Fetch the request
  const adminClient = createAdminClient();
  const { data: request, error: fetchErr } = await adminClient
    .from("deletion_requests")
    .select("*")
    .eq("id", requestId)
    .eq("org_id", org_id)
    .single();

  if (fetchErr || !request) {
    return { success: false, error: "Solicitud no encontrada" };
  }

  if (request.status !== "pending") {
    return { success: false, error: "Esta solicitud ya fue procesada" };
  }

  // Actually delete the entity
  let deleteError: Error | null = null;
  if (request.entity_type === "case") {
    const { error } = await adminClient.from("cases").delete().eq("id", request.entity_id).eq("org_id", org_id);
    if (error) deleteError = error;
  } else if (request.entity_type === "client") {
    const { error } = await adminClient.from("clients").delete().eq("id", request.entity_id).eq("org_id", org_id);
    if (error) deleteError = error;
  }

  if (deleteError) return handleError(deleteError);

  // Mark request as approved
  const { error: updateErr } = await adminClient
    .from("deletion_requests")
    .update({ status: "approved", reviewed_by: user.id })
    .eq("id", requestId);

  if (updateErr) return handleError(updateErr);

  // Notify the requester
  try {
    const typeLabel = request.entity_type === "case" ? "expediente" : "cliente";
    await createNotification(adminClient, {
      userId: request.requested_by,
      orgId: org_id,
      title: "Solicitud Aprobada",
      message: `Tu solicitud para eliminar el ${typeLabel} "${request.entity_label}" fue aprobada.`,
      type: "success",
      metadata: { deletion_request_id: requestId },
    });
  } catch (err) {
    console.error("Failed to send approval notification:", err);
  }

  revalidateTag(CACHE_TAGS.deletionRequests, {});
  revalidateTag(CACHE_TAGS.cases, {});
  revalidateTag(CACHE_TAGS.clients, {});
  return { success: true, data: undefined };
}

// ─── Reject Deletion Request ─────────────────────────────────────────────────

export async function rejectDeletionRequestAction(
  requestId: string,
  rejectReason?: string
): Promise<Result<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "No autorizado", code: ERROR_CODES.AUTH_UNAUTHORIZED };

  const role = user.app_metadata?.role as string | undefined;
  if (role !== "owner" && role !== "admin") {
    return { success: false, error: "Sin permisos", code: ERROR_CODES.AUTH_FORBIDDEN };
  }

  const org_id = user.app_metadata?.org_id as string;
  const adminClient = createAdminClient();

  const { data: request, error: fetchErr } = await adminClient
    .from("deletion_requests")
    .select("requested_by, entity_type, entity_label, status")
    .eq("id", requestId)
    .eq("org_id", org_id)
    .single();

  if (fetchErr || !request) return { success: false, error: "Solicitud no encontrada" };
  if (request.status !== "pending") return { success: false, error: "Esta solicitud ya fue procesada" };

  const { error: updateErr } = await adminClient
    .from("deletion_requests")
    .update({ status: "rejected", reviewed_by: user.id })
    .eq("id", requestId);

  if (updateErr) return handleError(updateErr);

  // Notify the requester
  try {
    const typeLabel = request.entity_type === "case" ? "expediente" : "cliente";
    const reasonNote = rejectReason ? ` Motivo: ${rejectReason}` : "";
    await createNotification(adminClient, {
      userId: request.requested_by,
      orgId: org_id,
      title: "Solicitud Rechazada",
      message: `Tu solicitud para eliminar el ${typeLabel} "${request.entity_label}" fue rechazada.${reasonNote}`,
      type: "warning",
      metadata: { deletion_request_id: requestId },
    });
  } catch (err) {
    console.error("Failed to send rejection notification:", err);
  }

  revalidateTag(CACHE_TAGS.deletionRequests, {});
  return { success: true, data: undefined };
}

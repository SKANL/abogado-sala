"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { createNotification } from "@/lib/services/notification-service";

/**
 * Mark a client-uploaded file as approved.
 * Any authenticated org member who has access to the case can approve.
 */
export async function approveFileAction(fileId: string, caseId: string): Promise<Result<void>> {
  if (!fileId || !caseId) {
    return { success: false, error: "Datos requeridos", code: ERROR_CODES.VAL_INVALID_INPUT };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sin acceso", code: ERROR_CODES.AUTH_UNAUTHORIZED };

  // RLS check: verify reviewer has access to this case
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id, org_id, token")
    .eq("id", caseId)
    .single();
  if (!caseRow) {
    return { success: false, error: "Expediente no encontrado", code: ERROR_CODES.AUTH_FORBIDDEN };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("case_files")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: null,
    })
    .eq("id", fileId)
    .eq("case_id", caseId);

  if (error) return handleError(error);

  revalidatePath(`/casos/${caseId}`);
  revalidateTag(CACHE_TAGS.caseDetail(caseId), {});
  // Invalidate portal page so next visit reflects approved status
  if ((caseRow as { token?: string }).token) {
    revalidatePath(`/sala/${(caseRow as { token: string }).token}`);
  }
  return { success: true, data: undefined };
}

/**
 * Reject a client-uploaded file, providing a review note explaining what's wrong.
 * The client will see the note in the portal and can re-upload.
 */
export async function rejectFileAction(
  fileId: string,
  caseId: string,
  reviewNote: string
): Promise<Result<void>> {
  if (!fileId || !caseId) {
    return { success: false, error: "Datos requeridos", code: ERROR_CODES.VAL_INVALID_INPUT };
  }
  if (!reviewNote?.trim()) {
    return { success: false, error: "Se requiere una nota explicando el rechazo", code: ERROR_CODES.VAL_INVALID_INPUT };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sin acceso", code: ERROR_CODES.AUTH_UNAUTHORIZED };

  // RLS check: verify reviewer has access to this case
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id, org_id, client_id, token")
    .eq("id", caseId)
    .single();
  if (!caseRow) {
    return { success: false, error: "Expediente no encontrado", code: ERROR_CODES.AUTH_FORBIDDEN };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("case_files")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote.trim(),
    })
    .eq("id", fileId)
    .eq("case_id", caseId);

  if (error) return handleError(error);

  // Notify the assigned lawyer (if rejecting as admin / different person)
  try {
    const { data: caseWithClient } = await adminClient
      .from("cases")
      .select("assigned_to, clients(full_name)")
      .eq("id", caseId)
      .single();
    if (caseWithClient?.assigned_to && caseWithClient.assigned_to !== user.id) {
      type ClientRef = { full_name?: string };
      const clientName = (caseWithClient.clients as ClientRef)?.full_name ?? "El cliente";
      await createNotification(adminClient, {
        userId: caseWithClient.assigned_to,
        orgId: caseRow.org_id,
        title: "Documento rechazado",
        message: `Se ha rechazado un documento de ${clientName}. El cliente deberá volver a subirlo.`,
        type: "warning",
        metadata: { case_id: caseId, link: `/casos/${caseId}` },
      });
    }
  } catch {
    // Non-fatal
  }

  revalidatePath(`/casos/${caseId}`);
  revalidateTag(CACHE_TAGS.caseDetail(caseId), {});
  // Invalidate portal page so client sees the rejection note on next visit
  if ((caseRow as { token?: string }).token) {
    revalidatePath(`/sala/${(caseRow as { token: string }).token}`);
  }
  return { success: true, data: undefined };
}

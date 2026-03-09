"use server";

import { createClient } from "@/lib/supabase/server";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

const VALID_TYPES = ["info", "milestone", "warning", "document_request"] as const;
type UpdateType = typeof VALID_TYPES[number];

/**
 * Publish a case update visible to the client via the portal link.
 * All org members with access to the case can publish updates.
 */
export async function publishCaseUpdateAction(
  caseId: string,
  title: string,
  body: string | null,
  type: UpdateType = "info"
): Promise<Result<void>> {
  if (!caseId || !title?.trim()) {
    return { success: false, error: "Título requerido", code: ERROR_CODES.VAL_INVALID_INPUT };
  }
  if (!VALID_TYPES.includes(type)) {
    return { success: false, error: "Tipo inválido", code: ERROR_CODES.VAL_INVALID_INPUT };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.app_metadata?.org_id as string | undefined;
  if (!orgId || !user) {
    return { success: false, error: "Sin acceso", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  // RLS check via user's client — verifies the user has access to this case
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .single();
  if (!caseRow) {
    return { success: false, error: "Expediente no encontrado", code: ERROR_CODES.AUTH_FORBIDDEN };
  }

  const { error } = await supabase
    .from("case_updates")
    .insert({
      case_id: caseId,
      org_id: orgId,
      author_id: user.id,
      title: title.trim(),
      body: body?.trim() || null,
      type,
    });

  if (error) return handleError(error);

  revalidatePath(`/casos/${caseId}`);
  revalidateTag(CACHE_TAGS.caseUpdates(caseId), {});
  return { success: true, data: undefined };
}

/**
 * Delete a case update. Admin/owner only.
 */
export async function deleteCaseUpdateAction(updateId: string, caseId: string): Promise<Result<void>> {
  if (!updateId || !caseId) {
    return { success: false, error: "Datos requeridos", code: ERROR_CODES.VAL_INVALID_INPUT };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role as string | undefined;

  if (role !== "owner" && role !== "admin") {
    return { success: false, error: "Sin permisos", code: ERROR_CODES.AUTH_FORBIDDEN };
  }

  const { error } = await supabase
    .from("case_updates")
    .delete()
    .eq("id", updateId);

  if (error) return handleError(error);

  revalidatePath(`/casos/${caseId}`);
  revalidateTag(CACHE_TAGS.caseUpdates(caseId), {});
  return { success: true, data: undefined };
}

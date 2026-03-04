"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { createNotification } from "@/lib/services/notification-service";
import { revalidatePath, revalidateTag } from "next/cache";
import { Result, ActionState } from "@/types";
import { ERROR_CODES, handleError } from "@/lib/utils/error-handler";
import { z } from "zod";
import { CACHE_TAGS } from "@/lib/cache-tags";

// ─── Case Notes ─────────────────────────────────────────────────────────────

const addNoteSchema = z.object({
  case_id: z.string().uuid("ID de expediente inválido"),
  content: z
    .string()
    .min(1, "La nota no puede estar vacía")
    .max(5000, "La nota no puede superar 5000 caracteres"),
});

export async function addCaseNoteAction(
  prevState: ActionState,
  formData: FormData
): Promise<Result<{ id: string }>> {
  const raw = {
    case_id: formData.get("case_id"),
    content: formData.get("content"),
  };

  const parse = addNoteSchema.safeParse(raw);
  if (!parse.success) {
    return {
      success: false,
      error: "Datos inválidos",
      validationErrors: parse.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autorizado", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  const org_id = user.app_metadata?.org_id as string | undefined;
  if (!org_id) {
    return { success: false, error: "Sin organización", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  const { data, error } = await supabase
    .from("case_notes")
    .insert({
      case_id: parse.data.case_id,
      org_id,
      author_id: user.id,
      content: parse.data.content,
    })
    .select("id")
    .single();

  if (error) return handleError(error);

  // Notify the assigned lawyer if they are not the note's author
  try {
    const adminClient = createAdminClient();
    const { data: caseRef } = await adminClient
      .from("cases")
      .select("org_id, assigned_to, clients(full_name)")
      .eq("id", parse.data.case_id)
      .single();

    type ClientRef = { full_name?: string };
    const clientData = caseRef?.clients as ClientRef | null;
    if (
      caseRef &&
      caseRef.assigned_to &&
      caseRef.assigned_to !== user.id // don't notify the author
    ) {
      await createNotification(adminClient, {
        userId: caseRef.assigned_to,
        orgId: caseRef.org_id,
        title: "Nueva Nota Interna",
        message: `Se ha añadido una nota al expediente de ${clientData?.full_name ?? "un cliente"}.`,
        type: "info",
        metadata: { case_id: parse.data.case_id, link: `/casos/${parse.data.case_id}?tab=notes` },
      });
    }
  } catch (err) {
    console.error("Failed to send case note notification:", err);
  }

  revalidatePath(`/casos/${parse.data.case_id}`);
  revalidateTag(CACHE_TAGS.caseNotes(parse.data.case_id), {});
  revalidateTag(CACHE_TAGS.caseDetail(parse.data.case_id), {});
  return { success: true, data: { id: data.id } };
}

export async function deleteCaseNoteAction(noteId: string): Promise<Result<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autorizado", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  const { data: note, error: fetchErr } = await supabase
    .from("case_notes")
    .select("case_id, author_id")
    .eq("id", noteId)
    .single();

  if (fetchErr || !note) {
    return { success: false, error: "Nota no encontrada" };
  }

  const role = user.app_metadata?.role as string | undefined;
  const isAuthor = note.author_id === user.id;
  const isOwnerAdmin = role === "owner" || role === "admin";

  if (!isAuthor && !isOwnerAdmin) {
    return { success: false, error: "Sin permiso para eliminar esta nota" };
  }

  const { error: delErr } = await supabase.from("case_notes").delete().eq("id", noteId);
  if (delErr) return handleError(delErr);

  revalidatePath(`/casos/${note.case_id}`);
  revalidateTag(CACHE_TAGS.caseNotes(note.case_id), {});
  revalidateTag(CACHE_TAGS.caseDetail(note.case_id), {});
  return { success: true, data: undefined };
}

// ─── Case Assignee ───────────────────────────────────────────────────────────

export async function assignCaseAction(
  caseId: string,
  assignedTo: string | null
): Promise<Result<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autorizado", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  const role = user.app_metadata?.role as string | undefined;
  if (role === "member") {
    return { success: false, error: "Sin permiso para reasignar expedientes" };
  }

  // assigned_to column — now typed via generated types
  const adminClient = createAdminClient();

  // Fetch the old assignee before updating
  const { data: beforeCase } = await adminClient
    .from("cases")
    .select("org_id, assigned_to, clients(full_name)")
    .eq("id", caseId)
    .single();

  const { error } = await supabase
    .from("cases")
    .update({ assigned_to: assignedTo })
    .eq("id", caseId);

  if (error) return handleError(error);

  type ClientRef = { full_name?: string };
  const clientData = beforeCase?.clients as ClientRef | null;
  const orgId = beforeCase?.org_id;
  const oldAssigneeId = beforeCase?.assigned_to;

  const notifications: Promise<void>[] = [];

  // Notify the newly assigned lawyer
  if (assignedTo && orgId) {
    notifications.push(
      createNotification(adminClient, {
        userId: assignedTo,
        orgId,
        title: "Nuevo Expediente Asignado",
        message: `Se te ha asignado el expediente de ${clientData?.full_name ?? "un cliente"}.`,
        type: "info",
        metadata: { case_id: caseId, link: `/casos/${caseId}` },
      }).catch((err) => console.error("Assign notification error:", err))
    );
  }

  // Notify the previous assignee (if different from the new one)
  if (oldAssigneeId && oldAssigneeId !== assignedTo && orgId) {
    notifications.push(
      createNotification(adminClient, {
        userId: oldAssigneeId,
        orgId,
        title: "Expediente Reasignado",
        message: `El expediente de ${clientData?.full_name ?? "un cliente"} ha sido reasignado a otro abogado.`,
        type: "warning",
        metadata: { case_id: caseId, link: `/casos/${caseId}` },
      }).catch((err) => console.error("Unassign notification error:", err))
    );
  }

  await Promise.all(notifications);

  revalidatePath(`/casos/${caseId}`);
  revalidateTag(CACHE_TAGS.caseDetail(caseId), {});
  return { success: true, data: undefined };
}

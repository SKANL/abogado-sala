"use server";

import { createClient } from "@/lib/supabase/server";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createTaskSchema = z.object({
  case_id:     z.string().uuid(),
  title:       z.string().min(1).max(255),
  description: z.string().max(2000).optional().or(z.literal("")),
  priority:    z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
  due_date:    z.string().optional().or(z.literal("")), // YYYY-MM-DD or empty
});

const updateTaskSchema = z.object({
  title:       z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().or(z.literal("")),
  priority:    z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
  due_date:    z.string().optional().or(z.literal("")),
  status:      z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus   = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskItem {
  id: string;
  case_id: string;
  org_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  creator?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createTaskAction(formData: FormData): Promise<Result<TaskItem>> {
  const raw = Object.fromEntries(formData);
  const parse = createTaskSchema.safeParse(raw);

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
  const orgId = user?.app_metadata?.org_id as string | undefined;

  if (!orgId || !user) {
    return { success: false, error: "Sin acceso", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  const payload = {
    org_id:      orgId,
    case_id:     parse.data.case_id,
    title:       parse.data.title,
    description: parse.data.description || null,
    priority:    parse.data.priority,
    assigned_to: parse.data.assigned_to || null,
    due_date:    parse.data.due_date || null,
    created_by:  user.id,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("tasks")
    .insert(payload)
    .select("*, assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url), creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url)")
    .single();

  if (error) return handleError(error);

  revalidateTag(CACHE_TAGS.caseTasks(parse.data.case_id), {});
  revalidateTag(CACHE_TAGS.myTasks, {});

  return { success: true, data: data as TaskItem };
}

// ─── Update status (quick toggle) ────────────────────────────────────────────

export async function updateTaskStatusAction(
  taskId: string,
  status: TaskStatus
): Promise<Result<void>> {
  if (!taskId) return { success: false, error: "ID requerido", code: ERROR_CODES.VAL_INVALID_INPUT };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.app_metadata?.org_id as string | undefined;

  if (!orgId || !user) {
    return { success: false, error: "Sin acceso", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  const updatePayload: Record<string, unknown> = { status };
  if (status === "completed") {
    updatePayload.completed_at = new Date().toISOString();
    updatePayload.completed_by = user.id;
  } else {
    updatePayload.completed_at = null;
    updatePayload.completed_by = null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, data: task } = await (supabase as any)
    .from("tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .eq("org_id", orgId)
    .select("case_id")
    .single();

  if (error) return handleError(error);

  revalidateTag(CACHE_TAGS.caseTasks((task as { case_id: string }).case_id), {});
  revalidateTag(CACHE_TAGS.myTasks, {});

  return { success: true, data: undefined };
}

// ─── Update (full edit) ──────────────────────────────────────────────────────

export async function updateTaskAction(
  taskId: string,
  formData: FormData
): Promise<Result<void>> {
  const raw = Object.fromEntries(formData);
  const parse = updateTaskSchema.safeParse(raw);

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
  const orgId = user?.app_metadata?.org_id as string | undefined;

  if (!orgId || !user) {
    return { success: false, error: "Sin acceso", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  const payload: Record<string, unknown> = {};
  if (parse.data.title       !== undefined) payload.title       = parse.data.title;
  if (parse.data.description !== undefined) payload.description = parse.data.description || null;
  if (parse.data.priority    !== undefined) payload.priority    = parse.data.priority;
  if (parse.data.assigned_to !== undefined) payload.assigned_to = parse.data.assigned_to || null;
  if (parse.data.due_date    !== undefined) payload.due_date    = parse.data.due_date    || null;
  if (parse.data.status      !== undefined) {
    payload.status = parse.data.status;
    if (parse.data.status === "completed") {
      payload.completed_at = new Date().toISOString();
      payload.completed_by = user.id;
    } else {
      payload.completed_at = null;
      payload.completed_by = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, data: task } = await (supabase as any)
    .from("tasks")
    .update(payload)
    .eq("id", taskId)
    .eq("org_id", orgId)
    .select("case_id")
    .single();

  if (error) return handleError(error);

  revalidateTag(CACHE_TAGS.caseTasks((task as { case_id: string }).case_id), {});
  revalidateTag(CACHE_TAGS.myTasks, {});

  return { success: true, data: undefined };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTaskAction(taskId: string): Promise<Result<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.app_metadata?.org_id as string | undefined;

  if (!orgId || !user) {
    return { success: false, error: "Sin acceso", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, data: task } = await (supabase as any)
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("org_id", orgId)
    .select("case_id")
    .single();

  if (error) return handleError(error);

  revalidateTag(CACHE_TAGS.caseTasks((task as { case_id: string }).case_id), {});
  revalidateTag(CACHE_TAGS.myTasks, {});

  return { success: true, data: undefined };
}

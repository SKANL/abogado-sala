"use server";

import { createClient } from "@/lib/supabase/server";
import { createCaseSchema, updateCaseSchema } from "@/lib/schemas/backend-contracts";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function createCaseAction(
  prevState: any,
  formData: FormData
): Promise<Result<any>> {
  const rawData = Object.fromEntries(formData) as any;
  
  // Handle JSON parsing for template_snapshot if passed as string
  if (typeof rawData.template_snapshot === 'string') {
      try {
          rawData.template_snapshot = JSON.parse(rawData.template_snapshot);
      } catch (e) {
          rawData.template_snapshot = {};
      }
  }

  const parse = createCaseSchema.safeParse(rawData);

  if (!parse.success) {
    return {
      success: false,
      error: "Datos inválidos",
      code: ERROR_CODES.VAL_INVALID_INPUT,
      validationErrors: parse.error.flatten().fieldErrors,
    };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const org_id = user?.app_metadata?.org_id;

  if (!org_id) {
    return { success: false, error: "No org_id found", code: ERROR_CODES.AUTH_UNAUTHORIZED };
  }

  // Note: Cast template_snapshot to Json if needed, but Supabase types usually match Json with generic objects.
  const { error, data: newCase } = await supabase
    .from("cases")
    .insert({
      ...parse.data,
      org_id,
      token,
      current_step_index: 0,
      template_snapshot: parse.data.template_snapshot as any, // Explicit cast to satisfy Json type if strictly typed
    })
    .select()
    .single();

  if (error) {
    return handleError(error);
  }

  revalidatePath("/casos");
  revalidatePath(`/clientes/${parse.data.client_id}`);
  return { success: true, data: newCase };
}

export async function updateCaseAction(
  prevState: any,
  formData: FormData
): Promise<Result<any>> {
  const rawData = Object.fromEntries(formData) as any;
  
  if (typeof rawData.template_snapshot === 'string') {
      try {
          rawData.template_snapshot = JSON.parse(rawData.template_snapshot);
      } catch (e) {
         // keep original if parse fails, validation will likely fail if schema expects object
      }
  }

  const parse = updateCaseSchema.safeParse(rawData);

  if (!parse.success) {
    return {
      success: false,
      error: "Datos inválidos",
      code: ERROR_CODES.VAL_INVALID_INPUT,
      validationErrors: parse.error.flatten().fieldErrors,
    };
  }

  const { case_id, ...updates } = parse.data;
  const supabase = await createClient();

  const { error, data: updatedCase } = await supabase
    .from("cases")
    .update({
        ...updates,
        template_snapshot: (updates as any).template_snapshot 
    })
    .eq("id", case_id)
    .select()
    .single();

  if (error) {
    return handleError(error);
  }
  
  revalidatePath(`/casos/${case_id}`);
  return { success: true, data: updatedCase };
}

export async function updateCaseProgressAction(
  token: string,
  step: number
): Promise<Result<void>> {
  const supabase = await createClient();
  
  const { error } = await supabase.rpc("update_case_progress", {
    p_token: token,
    p_step_index: step,
  });

  if (error) {
    return handleError(error);
  }
  
  return { success: true, data: undefined };
}

export async function confirmUploadAction(
  fileId: string,
  size: number,
  key: string
): Promise<Result<any>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("confirm_file_upload", {
    p_file_id: fileId,
    p_file_size: size,
    p_file_key: key,
  });

  if (error) {
    return handleError(error);
  }

  return { success: true, data };
}

export async function regenerateCaseTokenAction(caseId: string): Promise<Result<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerate_case_token", {
    p_case_id: caseId
  });

  if (error) {
      return handleError(error);
  }

  return { success: true, data };
}

export async function deleteFileAction(fileId: string): Promise<Result<void>> {
    const supabase = await createClient();
    
    // 1. Get file key first to queue deletion
    const { data: file } = await supabase
        .from("case_files")
        .select("file_key")
        .eq("id", fileId)
        .single();
    
    if (file?.file_key) {
        // 2. Queue for deletion
         await supabase.from("storage_delete_queue").insert({
             bucket_id: "case-files",
             file_path: file.file_key
         });
    }

    // 3. Delete from DB
    const { error } = await supabase.from("case_files").delete().eq("id", fileId);
    
    if (error) {
        return handleError(error);
    }
    
    return { success: true, data: undefined };
}

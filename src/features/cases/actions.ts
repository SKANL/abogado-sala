"use server";

import { createClient } from "@/lib/supabase/server";
import { createCaseSchema, updateCaseSchema } from "@/lib/schemas/backend-contracts";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { logActivity } from "@/lib/services/audit-service";

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

  // 1. Check if client is a prospect and promote to active (Conversion on Creation)
  const { data: clientStatus } = await supabase
    .from("clients")
    .select("status")
    .eq("id", parse.data.client_id)
    .single();

  if (clientStatus?.status === 'prospect') {
      await supabase
        .from("clients")
        .update({ status: 'active' })
        .eq("id", parse.data.client_id);
      
      revalidatePath("/clientes");
  }

  // 2. Create the case
  const { error, data: newCase } = await supabase
    .from("cases")
    .insert({
      ...parse.data,
      org_id,
      token,
      current_step_index: 0,
      template_snapshot: parse.data.template_snapshot as any,
    })
    .select()
    .single();

  if (error) {
    return handleError(error);
  }

  revalidatePath("/casos");
  revalidatePath(`/clientes/${parse.data.client_id}`);

  // Log Activity
  await logActivity({
      action: 'case_created',
      entityType: 'case',
      entityId: newCase.id,
      orgId: org_id,
      metadata: { case_title: (newCase.template_snapshot as any)?.title || 'Nuevo Caso' }
  });

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
    } as any)
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

  if (data) {
       await logActivity({
          action: 'file_uploaded',
          entityType: 'file',
          entityId: fileId,
          metadata: { file_key: key, file_size: size }
      });
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
    
    await logActivity({
        action: 'file_deleted',
        entityType: 'file',
        entityId: fileId,
        metadata: { file_key: file?.file_key }
    });

    return { success: true, data: undefined };
}
// ... existing code ...

export async function deleteCaseAction(caseId: string): Promise<Result<void>> {
    const supabase = await createClient();
    
    // 1. Verify User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado", code: ERROR_CODES.AUTH_UNAUTHORIZED };

    // 2. Fetch Case to verify permissions (RLS handles visibility, but we double check logic)
    // We need to know if the user is the assigned lawyer or admin.
    // However, a simple DELETE call is blocked by RLS if policy doesn't exist.
    // The policy "Delete Cases" must exist in SQL. 
    // If not, we rely on the RPC or logic here?
    // Let's assume standard RLS for DELETE is:
    // (auth.uid() = assigned_lawyer_id OR auth.is_admin())
    // Let's try direct delete. If it fails (count=0), it might be RLS or Not Found.

    const { error, count } = await supabase
        .from("cases")
        .delete({ count: "exact" })
        .eq("id", caseId);

    if (error) return handleError(error);
    if (count === 0) return { success: false, error: "No se pudo eliminar (Permisos o No encontrado)", code: ERROR_CODES.VAL_NOT_FOUND };

    revalidatePath("/casos");
    return { success: true, data: undefined };
}

export async function getSignedFileUrlAction(filePath: string): Promise<Result<string>> {
  try {
    const supabase = await createClient();
    
    // Create a signed URL valid for 1 hour
    const { data, error } = await supabase.storage
      .from('case-files')
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error("Error creating signed URL:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data.signedUrl };
  } catch (error) {
     return { success: false, error: "Error interno" };
  }
}

import { createJob } from "@/lib/services/job-service";

export async function finalizeCaseAction(caseId: string): Promise<Result<any>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.app_metadata?.org_id) {
        return { success: false, error: "Unauthorized", code: ERROR_CODES.AUTH_UNAUTHORIZED };
    }

    // 1. Update status to completed
    const { error: updateError } = await supabase
        .from("cases")
        .update({ status: 'completed' })
        .eq("id", caseId);

    if (updateError) return handleError(updateError);

    // 2. Create Zip Job
    try {
        await createJob(supabase, {
            orgId: user.app_metadata.org_id,
            requesterId: user.id, 
            type: 'zip_export',
            metadata: { case_id: caseId }
        });
    } catch (e) {
        console.error("Failed to create zip job", e);
    }

    // Log Activity
    await logActivity({
        action: 'status_changed',
        entityType: 'case',
        entityId: caseId,
        orgId: user.app_metadata.org_id,
        metadata: { new_status: 'completed' }
    });

    revalidatePath("/casos");
    return { success: true, data: { message: "Procesando descarga..." } };
}

export async function requestZipExportAction(caseId: string): Promise<Result<void>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.app_metadata?.org_id) {
        return { success: false, error: "Unauthorized", code: ERROR_CODES.AUTH_UNAUTHORIZED };
    }

    try {
        await createJob(supabase, {
            orgId: user.app_metadata.org_id,
            requesterId: user.id, 
            type: 'zip_export',
            metadata: { case_id: caseId }
        });
        
        await logActivity({
            action: 'zip_exported',
            entityType: 'case',
            entityId: caseId,
            orgId: user.app_metadata.org_id
        });

        return { success: true, data: undefined };
    } catch (e: any) {
        console.error("Failed to create zip job", e);
        return { success: false, error: e.message || "Error al solicitar exportación" };
    }
}

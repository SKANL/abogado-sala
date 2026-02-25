"use server";

import { createClient } from "@/lib/supabase/server";
import { createTemplateSchema, updateTemplateSchema } from "@/lib/schemas/backend-contracts";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";
import { revalidatePath } from "next/cache";

export async function createTemplateAction(
  prevState: any,
  formData: FormData
): Promise<Result<any>> {
  const rawData = Object.fromEntries(formData) as any;
  
  // Parse schema if it's a string (e.g. hidden input)
  if (typeof rawData.schema === 'string') {
      try {
          rawData.schema = JSON.parse(rawData.schema);
      } catch (e) {
          rawData.schema = {};
      }
  }

  const parse = createTemplateSchema.safeParse(rawData);

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

  const { error, data: newTemplate } = await supabase
    .from("templates")
    .insert({
      ...parse.data,
      org_id,
      owner_id: user.id
    })
    .select()
    .single();

  if (error) {
    return handleError(error);
  }

  revalidatePath("/plantillas");
  return { success: true, data: newTemplate };
}

export async function updateTemplateAction(
  prevState: any,
  formData: FormData
): Promise<Result<any>> {
  const rawData = Object.fromEntries(formData) as any;

  if (typeof rawData.schema === 'string') {
      try {
          rawData.schema = JSON.parse(rawData.schema);
      } catch (e) {
          // Keep original or fail validation
      }
  }

  const parse = updateTemplateSchema.safeParse(rawData);

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

  // Explicit type casting to satisfy Supabase types for JSONB
  const updatePayload : any = { ...updates };

  const { error, data: updatedTemplate } = await supabase
    .from("templates")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return handleError(error);
  }

  revalidatePath("/plantillas");
  return { success: true, data: updatedTemplate };
}

export async function deleteTemplateAction(templateId: string): Promise<Result<void>> {
    if (!templateId) return { success: false, error: "ID requerido" };

    const supabase = await createClient();

    // Check for active cases using this template
    const { count } = await supabase
        .from("cases")
        .select("id", { count: "exact", head: true })
        .eq("template_id", templateId)
        .not("status", "eq", "archived");

    if ((count ?? 0) > 0) {
        return {
            success: false,
            error: `Esta plantilla tiene ${count} expediente(s) activo(s) y no puede eliminarse.`,
        };
    }

    const { error } = await supabase.from("templates").delete().eq("id", templateId);

    if (error) {
        return handleError(error);
    }

    revalidatePath("/plantillas");
    return { success: true, data: undefined };
}

export async function syncTemplateToCasesAction(templateId: string): Promise<Result<{ updatedCount: number }>> {
    if (!templateId) return { success: false, error: "ID de plantilla requerido" };

    const supabase = await createClient();

    // 1. Fetch the template
    const { data: template, error: templateError } = await supabase
        .from("templates")
        .select("schema")
        .eq("id", templateId)
        .single();

    if (templateError || !template) {
        return { success: false, error: "Plantilla no encontrada" };
    }

    // 2. Fetch active cases using this template
    const { data: activeCases, error: casesError } = await supabase
        .from("cases")
        .select("id")
        .eq("template_id", templateId)
        .not("status", "eq", "completed")
        .not("status", "eq", "archived");

    if (casesError) {
        return handleError(casesError);
    }

    if (!activeCases || activeCases.length === 0) {
        return { success: true, data: { updatedCount: 0 } };
    }

    // 3. Update all these cases with the new template_snapshot
    const caseIds = activeCases.map(c => c.id);
    
    // Explicit type casting
    const updatePayload: any = { template_snapshot: template.schema };

    const { error: updateError } = await supabase
        .from("cases")
        .update(updatePayload)
        .in("id", caseIds);

    if (updateError) {
        return handleError(updateError);
    }

    return { success: true, data: { updatedCount: caseIds.length } };
}

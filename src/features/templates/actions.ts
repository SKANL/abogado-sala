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
    const { error } = await supabase.from("templates").delete().eq("id", templateId);

    if (error) {
        return handleError(error);
    }

    revalidatePath("/plantillas");
    return { success: true, data: undefined };
}

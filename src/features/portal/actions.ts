"use server";

import { createClient } from "@/lib/supabase/server";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";
import { revalidatePath } from "next/cache";

// Type definition matches RPC return
export type CasePublic = {
  case: any; // Ideally stricter case type
  client_name: string;
  files: any[];
};

export async function getCaseByTokenAction(token: string): Promise<Result<CasePublic>> {
  if (!token) {
     return { success: false, error: "Token requerido", code: ERROR_CODES.VAL_INVALID_INPUT };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_case_by_token", {
    p_token: token,
  });

  if (error) {
    return handleError(error);
  }

  return { success: true, data: data as CasePublic };
}

export async function flagFileExceptionAction(
  token: string,
  fileId: string,
  reason: string
): Promise<Result<void>> {
  if (!token || !fileId || !reason) {
     return { success: false, error: "Faltan datos", code: ERROR_CODES.VAL_INVALID_INPUT };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("flag_file_exception", {
    p_token: token,
    p_file_id: fileId,
    p_reason: reason
  });

  if (error) {
    return handleError(error);
  }

  revalidatePath(`/sala/${token}`);
  return { success: true, data: undefined };
}

export async function logPortalAccessAction(
    token: string,
    event: string, // PortalEventEnum
    metadata: any = {}
): Promise<Result<void>> {
    // Analytics is fire-and-forget mostly, but we return Result
    const supabase = await createClient();
    
    // We can verify token first if strict, or just insert if schema allows
    // But table 'portal_analytics' needs case_id?
    // Let's assume we can fetch case_id from token or better:
    // backend-contracts says: "Registra analítica... Eventos..."
    // Table: portal_analytics (case_id, event_type, metadata...)
    // So we need case_id.
    
    const { data: caseData } = await supabase.from("cases").select("id").eq("token", token).single();
    
    if (caseData) {
        await supabase.from("portal_analytics").insert({
            case_id: caseData.id,
            event_type: event,
            metadata: metadata
        });
    }

    return { success: true, data: undefined };
}

export async function advanceStepAction(
  token: string,
  newStepIndex: number
): Promise<Result<void>> {
  if (!token || newStepIndex === undefined) {
      return { success: false, error: "Datos requeridos", code: ERROR_CODES.VAL_INVALID_INPUT };
  }

  const supabase = await createClient();
  
  // Verify token and get case ID first to be safe, or direct update if RLS allows
  const { data: caseData, error: fetchError } = await supabase
      .from("cases")
      .select("id")
      .eq("token", token)
      .single();

  if (fetchError || !caseData) {
      return { success: false, error: "Caso no encontrado", code: ERROR_CODES.VAL_NOT_FOUND };
  }

  const { error } = await supabase
      .from("cases")
      .update({ 
          current_step_index: newStepIndex,
          updated_at: new Date().toISOString()
      })
      .eq("id", caseData.id);

  if (error) {
      return handleError(error);
  }

  revalidatePath(`/sala/${token}`);
  return { success: true, data: undefined };
}

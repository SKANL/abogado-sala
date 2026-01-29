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
    const supabase = await createClient();
    
    // Use RPC to bypass RLS
    await supabase.rpc("log_portal_access", {
        p_case_token: token,
        p_event_type: event,
        p_metadata: metadata || {}
    });

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
  
  // Use RPC to bypass RLS (since user is anonymous/guest)
  const { error } = await supabase.rpc("update_case_progress", {
    p_token: token,
    p_step_index: newStepIndex
  });

  if (error) {
      return handleError(error);
  }

  revalidatePath(`/sala/${token}`);
  return { success: true, data: undefined };
}

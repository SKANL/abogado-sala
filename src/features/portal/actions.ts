"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { createNotification } from "@/lib/services/notification-service";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";
import type { Json } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";

// Type definition matches RPC return
export type PortalFile = {
  id: string;
  category: string;
  description?: string | null;
  status: 'pending' | 'uploaded' | 'missing' | 'rejected' | 'exception';
};

export type CasePublic = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  case: any; // Complex dynamic shape from RPC — strict typing deferred
  client_name: string;
  files: PortalFile[];
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
    metadata: Record<string, unknown> = {}
): Promise<Result<void>> {
    const supabase = await createClient();
    
    // Use RPC to bypass RLS
    await supabase.rpc("log_portal_access", {
        p_case_token: token,
        p_event_type: event,
        p_metadata: (metadata || {}) as Json
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

  // Trigger Notifications using Admin Client
  try {
      const adminClient = createAdminClient();
      const { data: caseRef } = await adminClient
        .from('cases')
        .select(`
          id, org_id, token,
          clients ( full_name, assigned_lawyer_id )
        `)
        .eq('token', token)
        .single();
        
      type ClientRef = { full_name?: string; assigned_lawyer_id?: string };
      const clientData = caseRef?.clients as ClientRef;
      if (caseRef && clientData && clientData.assigned_lawyer_id) {
          const clientName = clientData.full_name || 'Un cliente';
          const lawyerId = clientData.assigned_lawyer_id;
          
          if (newStepIndex === 1) {
              await createNotification(adminClient, {
                  userId: lawyerId,
                  orgId: caseRef.org_id,
                  title: "Ingreso al Portal",
                  message: `${clientName} ha ingresado al portal del caso.`,
                  type: 'info',
                  metadata: { case_id: caseRef.id, link: `/casos/${caseRef.id}` }
              });
          }
      }
  } catch (err) {
      console.error("Failed to send notification for advanceStep:", err);
  }

  revalidatePath(`/sala/${token}`);
  return { success: true, data: undefined };
}

export async function submitQuestionnaireAction(
  token: string,
  answers: Record<string, string>
): Promise<Result<void>> {
  if (!token || !answers) {
     return { success: false, error: "Respuestas requeridas", code: ERROR_CODES.VAL_INVALID_INPUT };
  }

  const supabase = await createClient();
  
  const { error } = await supabase.rpc("submit_questionnaire_answers", {
    p_token: token,
    p_answers: answers
  });

  if (error) {
    return handleError(error);
  }

  // Trigger Notification
  try {
      const adminClient = createAdminClient();
      const { data: caseRef } = await adminClient
        .from('cases')
        .select(`
          id, org_id, token,
          clients ( full_name, assigned_lawyer_id )
        `)
        .eq('token', token)
        .single();
        
      type ClientRef2 = { full_name?: string; assigned_lawyer_id?: string };
      const clientData2 = caseRef?.clients as ClientRef2;
      if (caseRef && clientData2 && clientData2.assigned_lawyer_id) {
          const clientName = clientData2.full_name || 'Un cliente';
          const lawyerId = clientData2.assigned_lawyer_id;
          
          await createNotification(adminClient, {
              userId: lawyerId,
              orgId: caseRef.org_id,
              title: "Cuestionario Completado",
              message: `${clientName} ha completado el cuestionario del caso.`,
              type: 'success',
              metadata: { case_id: caseRef.id, link: `/casos/${caseRef.id}?tab=info` }
          });
      }
  } catch (err) {
      console.error("Failed to send notification for questionnaire:", err);
  }

  revalidatePath(`/sala/${token}`);
  return { success: true, data: undefined };
}

export async function confirmPortalUploadAction(
    token: string,
    fileId: string,
    fileKey: string,
    fileSize: number
): Promise<Result<void>> {
    const supabase = await createClient();

    const { error } = await supabase.rpc("confirm_file_upload_portal", {
        p_token: token,
        p_file_id: fileId,
        p_file_key: fileKey,
        p_file_size: fileSize
    });

    if (error) {
        // console.error("Error confirming portal upload:", error);
        return handleError(error);
    }

    // Trigger Notification
    try {
        const adminClient = createAdminClient();
        const { data: caseRef } = await adminClient
          .from('cases')
          .select(`
            id, org_id, token,
            clients ( full_name, assigned_lawyer_id )
          `)
          .eq('token', token)
          .single();
          
        type ClientRef3 = { full_name?: string; assigned_lawyer_id?: string };
        const clientData3 = caseRef?.clients as ClientRef3;
        if (caseRef && clientData3 && clientData3.assigned_lawyer_id) {
            const clientName = clientData3.full_name || 'Un cliente';
            const lawyerId = clientData3.assigned_lawyer_id;
            
            await createNotification(adminClient, {
                userId: lawyerId,
                orgId: caseRef.org_id,
                title: "Nuevo Documento",
                message: `${clientName} ha cargado un documento en el caso.`,
                type: 'info',
                metadata: { case_id: caseRef.id, link: `/casos/${caseRef.id}?tab=docs` }
            });
        }
    } catch (err) {
        console.error("Failed to send notification for upload:", err);
    }

    revalidatePath(`/sala/${token}`);
    return { success: true, data: undefined };
}

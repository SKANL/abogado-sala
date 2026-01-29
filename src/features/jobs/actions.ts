"use server";

import { createClient } from "@/lib/supabase/server";
import { jobRequestSchema } from "@/lib/schemas/backend-contracts";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";

export async function requestZipGenerationAction(
    prevState: any,
    formData: FormData
): Promise<Result<void>> {
    const rawData = Object.fromEntries(formData);
    const parse = jobRequestSchema.safeParse(rawData);

    if (!parse.success) {
        return {
            success: false,
            error: "Datos inválidos",
            code: ERROR_CODES.VAL_INVALID_INPUT,
            validationErrors: parse.error.flatten().fieldErrors,
        };
    }

    const { case_id, type } = parse.data;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
         return { success: false, error: "No autorizado", code: ERROR_CODES.AUTH_UNAUTHORIZED };
    }

    const org_id = user.app_metadata?.org_id;
    if (!org_id) {
         return { success: false, error: "Organización no encontrada", code: ERROR_CODES.AUTH_UNAUTHORIZED };
    }

    // Check if case belongs to org (RLS handles this but good to check context if doing metadata)
    // Actually RLS for insert on 'jobs' should just allow insert with valid org_id
    
    const { error } = await supabase
        .from("jobs")
        .insert({
            org_id,
            requester_id: user.id,
            type,
            metadata: { case_id }
        });

    if (error) {
        return handleError(error);
    }
    
    return { success: true, data: undefined };
}

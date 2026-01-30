import { SupabaseClient } from "@supabase/supabase-js";
import { ERROR_CODES } from "@/lib/utils/error-handler";

export async function createJob(
    supabase: SupabaseClient,
    params: {
        orgId: string;
        requesterId: string;
        type: 'zip_export' | 'report_gen';
        metadata?: any;
    }
) {
    const { data, error } = await supabase
        .from("jobs")
        .insert({
            org_id: params.orgId,
            requester_id: params.requesterId,
            type: params.type,
            metadata: params.metadata
        })
        .select()
        .single();
    
    if (error) {
        throw new Error(error.message);
    }

    return data;
}

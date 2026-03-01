import { SupabaseClient } from "@supabase/supabase-js";

export async function createJob(
    supabase: SupabaseClient,
    params: {
        orgId: string;
        requesterId: string;
        type: 'zip_export' | 'report_gen';
        metadata?: Record<string, unknown>;
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

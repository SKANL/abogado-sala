import { SupabaseClient } from "@supabase/supabase-js";

export async function createNotification(
    supabase: SupabaseClient,
    params: {
        userId: string;
        orgId: string;
        title: string;
        message: string;
        type: 'info' | 'warning' | 'success' | 'error';
    }
) {
    // Fire and forget (don't block main thread too much, but wait for ack)
    const { error } = await supabase
        .from("notifications")
        .insert({
            user_id: params.userId,
            org_id: params.orgId,
            title: params.title,
            message: params.message,
            type: params.type
        });
    
    if (error) {
        console.error("Failed to create notification:", error);
    }
}

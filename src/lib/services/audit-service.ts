import { createClient } from "@/lib/supabase/server";

export type AuditAction = 
    | 'case_created' 
    | 'case_updated' 
    | 'file_uploaded' 
    | 'file_deleted' 
    | 'status_changed' 
    | 'login' 
    | 'settings_updated'
    | 'zip_exported';

export type EntityType = 'case' | 'file' | 'client' | 'org' | 'user';

interface LogActivityParams {
    action: AuditAction;
    entityType: EntityType;
    entityId: string;
    metadata?: Record<string, any>;
    orgId?: string; // Optional if we can infer, but better explicit
}

export async function logActivity(params: LogActivityParams) {
    try {
        const supabase = await createClient();
        
        // If orgId not provided, try to get from current user
        let orgId = params.orgId;
        let userId: string | null = null;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            userId = user.id;
            if (!orgId) {
                orgId = user.app_metadata?.org_id;
            }
        }

        if (!orgId) {
            console.warn("Audit Log Skipped: No Org ID found", params);
            return;
        }

        const { error } = await supabase.from('audit_logs').insert({
            org_id: orgId,
            actor_id: userId,
            action: params.action,
            entity_type: params.entityType,
            entity_id: params.entityId,
            metadata: params.metadata || {}
        });

        if (error) {
            console.error("Audit Log Error:", error);
        }
    } catch (e) {
        console.error("Audit Log Exception:", e);
    }
}

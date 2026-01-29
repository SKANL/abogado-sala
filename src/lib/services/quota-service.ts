import { SupabaseClient } from "@supabase/supabase-js";
import { ERROR_CODES } from "@/lib/utils/error-handler";

type QuotaType = "clients" | "admins" | "storage";

export async function checkOrgQuota(
    supabase: SupabaseClient,
    orgId: string,
    type: QuotaType,
    increment: number = 1
): Promise<{ allowed: boolean; error?: string; code?: string }> {
    // 1. Get Org Plan & Usage
    const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("plan_tier, storage_used")
        .eq("id", orgId)
        .single();

    if (orgError || !org) return { allowed: false, error: "Error checking organization", code: ERROR_CODES.VAL_NOT_FOUND };

    // 2. Get Plan Limits
    const { data: config, error: configError } = await supabase
        .from("plan_configs")
        .select("*")
        .eq("plan", org.plan_tier)
        .single();
    
    if (configError || !config) return { allowed: false, error: "Error checking plan config", code: ERROR_CODES.VAL_NOT_FOUND };

    // 3. Check specific quota
    if (type === "clients") {
        const { count, error: countError } = await supabase
            .from("clients")
            .select("*", { count: "exact", head: true })
            .eq("org_id", orgId);
        
        if (countError) return { allowed: false, error: "Error counting clients", code: ERROR_CODES.VAL_NOT_FOUND };
        
        if ((count || 0) + increment > config.max_clients) {
            return { allowed: false, error: `Límite de clientes alcanzado (${config.max_clients})`, code: ERROR_CODES.BILLING_QUOTA_CLIENTS };
        }
    }

    if (type === "storage") {
         if (org.storage_used + increment > config.max_storage_bytes) {
             return { allowed: false, error: "Límite de almacenamiento alcanzado", code: ERROR_CODES.BILLING_QUOTA_STORAGE };
         }
    }

    return { allowed: true };
}

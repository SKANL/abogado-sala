"use server";

import { createClient } from "@/lib/supabase/server";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";

export type PlanConfig = {
    plan: string;
    max_clients: number;
    max_admins: number;
    max_storage_bytes: number;
    can_white_label: boolean;
};

export async function getOrganizationConfigAction(): Promise<Result<{ tier: string, limits: PlanConfig }>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
         return { success: false, error: "No autorizado", code: ERROR_CODES.AUTH_UNAUTHORIZED };
    }

    const org_id = user.app_metadata?.org_id;
    if (!org_id) {
         return { success: false, error: "Org no encontrada", code: ERROR_CODES.AUTH_UNAUTHORIZED };
    }

    // 1. Get Org Tier
    const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("plan_tier")
        .eq("id", org_id)
        .single();
        
    if (orgError) return handleError(orgError);

    // 2. Get Plan Config from 'plan_configs' table
    const { data: config, error: configError } = await supabase
        .from("plan_configs")
        .select("*")
        .eq("plan", org.plan_tier)
        .single();

    if (configError) return handleError(configError);

    return { 
        success: true, 
        data: { 
            tier: org.plan_tier, 
            limits: config as PlanConfig 
        } 
    };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";

export async function getOrganizationDetailsAction(): Promise<Result<any>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized", code: ERROR_CODES.AUTH_UNAUTHORIZED };
    }

    const orgId = user.app_metadata.org_id;
    if (!orgId) {
         // Should not happen if tr_sync_claims is working
         return { success: false, error: "No organization", code: ERROR_CODES.VAL_NOT_FOUND };
    }

    const { data: org, error } = await supabase
        .from("organizations")
        .select("id, name, slug, plan_tier, plan_status, trial_ends_at, primary_color, logo_url")
        .eq("id", orgId)
        .single();

    if (error) {
        return handleError(error);
    }

    const role = user.app_metadata.role || "member";

    return {
        success: true,
        data: { ...org, role }
    };
}

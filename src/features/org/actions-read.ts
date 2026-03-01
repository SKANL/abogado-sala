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
        .select("id, name, slug, plan_tier, plan_status, trial_ends_at")
        .eq("id", orgId)
        .single();

    if (error) {
        return handleError(error);
    }

    // --- Effective billing status ---
    // The DB stores the raw `plan_status` written by Stripe webhooks (or manually).
    // When billing is manual, a trial can expire without the DB field updating automatically.
    // We compute an effective status here so the PaymentWall renders correctly without
    // requiring a cron job or Stripe webhook to flip the value.
    let effectivePlanStatus = org.plan_status;
    if (
        org.plan_status === "trialing" &&
        org.trial_ends_at &&
        new Date(org.trial_ends_at) < new Date()
    ) {
        // Trial window has passed — block access until owner arranges payment.
        // Using "expired" (not "canceled") so we can show a distinct message and
        // the owner can reactivate by setting plan_status = "active" in Supabase.
        effectivePlanStatus = "expired";
    }

    // Determine Role
    // For now we assume the claim in app_metadata is truthy, but let's double check logic if needed.
    // Ideally we join with `profiles` or `organization_members` if `app_metadata` is stale.
    // For MVP, app_metadata role is fast.
    const role = user.app_metadata.role || "member"; // Default to member if role missing in metadata for now, though we could also fetch from profile.

    return {
        success: true,
        data: {
            ...org,
            plan_status: effectivePlanStatus, // expose effective status to the UI gate
            role
        }
    };
}

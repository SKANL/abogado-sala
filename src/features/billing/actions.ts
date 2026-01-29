"use server";

import { createClient } from "@/lib/supabase/server";
import { stripeCheckoutSchema } from "@/lib/schemas/backend-contracts";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";

export async function createStripeCheckoutAction(
    prevState: any,
    formData: FormData
): Promise<Result<{ url: string }>> {
    const rawData = Object.fromEntries(formData);
    const parse = stripeCheckoutSchema.safeParse(rawData);

    if (!parse.success) {
         return {
            success: false,
            error: "Plan inválido",
            code: ERROR_CODES.VAL_INVALID_INPUT,
            validationErrors: parse.error.flatten().fieldErrors,
        };
    }

    const { plan } = parse.data;

    // Placeholder: In a real app, you would initialize Stripe and create a session
    // const session = await stripe.checkout.sessions.create({ ... });
    
    console.log(`[Mock] Creating Stripe Checkout for plan: ${plan}`);

    // Allow simulating success for demo
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { 
        success: true, 
        data: { url: "https://example.com/mock-stripe-checkout?plan=" + plan } 
    };
}

export async function createStripePortalAction(): Promise<Result<{ url: string }>> {
    // Placeholder: Create customer portal session
    console.log(`[Mock] Creating Stripe Customer Portal`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { 
        success: true, 
        data: { url: "https://example.com/mock-customer-portal" } 
    };
}

export async function getSubscriptionAction(): Promise<Result<any>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.app_metadata?.org_id) {
        return { success: false, error: "No org_id found", code: ERROR_CODES.AUTH_UNAUTHORIZED };
    }

    const { data: org, error } = await supabase
        .from("organizations")
        .select("plan_tier, plan_status, trial_ends_at, stripe_customer_id")
        .eq("id", user.app_metadata.org_id)
        .single();

    if (error) {
        return handleError(error);
    }

    // Determine effective status (logic for trial expiration vs active)
    let effectiveStatus = org.plan_status;
    if (org.plan_status === 'trialing' && org.trial_ends_at && new Date(org.trial_ends_at) < new Date()) {
        effectiveStatus = 'canceled'; // Or 'expired'
    }

    return { 
        success: true, 
        data: {
            ...org,
            status: effectiveStatus
        }
    };
}

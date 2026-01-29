import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// CAUTION: Use Service Role Key for Admin updates
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature");

  let event;

  try {
      // IN PRODUCTION: Initialize Stripe and verify signature
      // event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
      
      // FOR DEMO/DEV: Parse directly (INSECURE - DO NOT DEPLOY WITHOUT SECRETS)
      event = JSON.parse(body);
  } catch (err: any) {
      return NextResponse.json({ error: `Webhook Check failed: ${err.message}` }, { status: 400 });
  }

  try {
      switch (event.type) {
          case 'invoice.payment_succeeded': {
              const subscription = event.data.object;
              const customerId = subscription.customer;
              // 1. Activate Org
              await supabaseAdmin
                  .from("organizations")
                  .update({ 
                      plan_status: 'active',
                      trial_ends_at: null // Clear trial
                  })
                  .eq("stripe_customer_id", customerId);
              break;
          }
          case 'invoice.payment_failed': {
              const subscription = event.data.object;
              const customerId = subscription.customer;
               await supabaseAdmin
                  .from("organizations")
                  .update({ plan_status: 'past_due' })
                  .eq("stripe_customer_id", customerId);
              break;
          }
          case 'customer.subscription.deleted': {
               const subscription = event.data.object;
               const customerId = subscription.customer;
               await supabaseAdmin
                  .from("organizations")
                  .update({ plan_status: 'canceled' })
                  .eq("stripe_customer_id", customerId);
              break;
          }
      }
      
      return NextResponse.json({ received: true });
  } catch (err: any) {
      console.error("Webhook Logic Error:", err);
      return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

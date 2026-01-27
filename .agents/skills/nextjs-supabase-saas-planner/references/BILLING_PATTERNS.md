# Stripe Billing Integration for Next.js + Supabase SaaS

## Overview

Complete Stripe billing patterns for subscription-based SaaS applications using Next.js 15 and Supabase.

---

## Initial Setup

### Install Stripe

```bash
npm install stripe @stripe/stripe-js
```

### Environment Variables

```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Stripe Client Setup

```typescript
// lib/stripe/server.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// lib/stripe/client.ts
import { loadStripe } from '@stripe/stripe-js';

export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};
```

---

## Pricing Plans Setup

### Database Schema

```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  stripe_product_id TEXT,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  features JSONB DEFAULT '[]',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Example data
INSERT INTO plans (name, description, price_monthly, price_yearly, features, limits) VALUES
('Free', 'Perfect for trying out', 0, 0, 
 '["5 projects", "Basic support", "1GB storage"]',
 '{"projects": 5, "storage_gb": 1, "team_members": 1}'),
('Pro', 'For growing teams', 29, 290,
 '["Unlimited projects", "Priority support", "50GB storage", "Advanced analytics"]',
 '{"projects": -1, "storage_gb": 50, "team_members": 10}'),
('Enterprise', 'For large organizations', 99, 990,
 '["Everything in Pro", "Dedicated support", "Unlimited storage", "SSO", "Custom integrations"]',
 '{"projects": -1, "storage_gb": -1, "team_members": -1}');
```

---

## Subscription Flow

### 1. Create Checkout Session

```typescript
// actions/billing/create-checkout.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';
import { redirect } from 'next/navigation';

export async function createCheckoutSession(
  organizationId: string,
  priceId: string,
  billingCycle: 'monthly' | 'yearly'
) {
  const supabase = await createClient();
  
  // Get organization
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (!org) {
    throw new Error('Organization not found');
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Create or retrieve customer
  let customerId = org.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        organization_id: organizationId,
        user_id: user.id,
      },
    });
    customerId = customer.id;

    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', organizationId);
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: {
      organization_id: organizationId,
      billing_cycle: billingCycle,
    },
    subscription_data: {
      metadata: {
        organization_id: organizationId,
      },
    },
  });

  redirect(session.url!);
}
```

### 2. Pricing Page Component

```typescript
// app/(marketing)/pricing/page.tsx
import { createClient } from '@/lib/supabase/server';
import { PricingCard } from '@/components/pricing/pricing-card';

export default async function PricingPage() {
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  return (
    <div className="container mx-auto py-20">
      <h1 className="text-4xl font-bold text-center mb-12">
        Choose Your Plan
      </h1>
      
      <div className="grid md:grid-cols-3 gap-8">
        {plans?.map((plan) => (
          <PricingCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}
```

```typescript
// components/pricing/pricing-card.tsx
'use client';

import { createCheckoutSession } from '@/actions/billing/create-checkout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PricingCard({ plan }: { plan: any }) {
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const router = useRouter();

  const handleSubscribe = async () => {
    setLoading(true);

    try {
      // Get current organization
      const orgId = localStorage.getItem('current_org_id');
      
      if (!orgId) {
        router.push('/login');
        return;
      }

      const priceId = billingCycle === 'monthly' 
        ? plan.stripe_price_id_monthly 
        : plan.stripe_price_id_yearly;

      await createCheckoutSession(orgId, priceId, billingCycle);
    } catch (error) {
      console.error('Checkout error:', error);
      setLoading(false);
    }
  };

  const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  const features = JSON.parse(plan.features || '[]');

  return (
    <Card className="p-8">
      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
      <p className="text-gray-600 mb-6">{plan.description}</p>

      <div className="mb-6">
        <span className="text-4xl font-bold">${price}</span>
        <span className="text-gray-600">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          variant={billingCycle === 'monthly' ? 'default' : 'outline'}
          onClick={() => setBillingCycle('monthly')}
        >
          Monthly
        </Button>
        <Button
          variant={billingCycle === 'yearly' ? 'default' : 'outline'}
          onClick={() => setBillingCycle('yearly')}
        >
          Yearly (Save {Math.round((1 - (plan.price_yearly / 12) / plan.price_monthly) * 100)}%)
        </Button>
      </div>

      <Button 
        onClick={handleSubscribe} 
        disabled={loading}
        className="w-full mb-6"
      >
        {loading ? 'Processing...' : plan.price_monthly === 0 ? 'Get Started' : 'Subscribe'}
      </Button>

      <ul className="space-y-3">
        {features.map((feature: string, i: number) => (
          <li key={i} className="flex items-center">
            <span className="mr-2">✓</span>
            {feature}
          </li>
        ))}
      </ul>
    </Card>
  );
}
```

---

## Webhook Handler

### Setup Webhook Endpoint

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, supabase);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object, supabase);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabase);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object, supabase);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  const organizationId = session.metadata?.organization_id;

  if (!organizationId) {
    throw new Error('No organization_id in metadata');
  }

  await supabase
    .from('organizations')
    .update({
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      subscription_status: 'active',
    })
    .eq('id', organizationId);
}

async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const organizationId = subscription.metadata.organization_id;

  if (!organizationId) {
    throw new Error('No organization_id in metadata');
  }

  // Get plan from price ID
  const priceId = subscription.items.data[0].price.id;
  const { data: plan } = await supabase
    .from('plans')
    .select('name')
    .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
    .single();

  await supabase
    .from('organizations')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_tier: plan?.name?.toLowerCase() || 'free',
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', organizationId);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  await supabase
    .from('organizations')
    .update({
      subscription_status: 'canceled',
      subscription_tier: 'free',
      stripe_subscription_id: null,
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any
) {
  // Log payment for record keeping
  if (invoice.subscription) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single();

    if (org) {
      await supabase.from('payment_history').insert({
        organization_id: org.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: 'succeeded',
        invoice_id: invoice.id,
        invoice_url: invoice.hosted_invoice_url,
      });
    }
  }
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  // Notify customer of payment failure
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  if (org) {
    // Send email notification
    // Log failed payment
    await supabase.from('payment_history').insert({
      organization_id: org.id,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      status: 'failed',
      invoice_id: invoice.id,
    });
  }
}
```

---

## Subscription Management

### Cancel Subscription

```typescript
// actions/billing/cancel-subscription.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';

export async function cancelSubscription(organizationId: string) {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_subscription_id')
    .eq('id', organizationId)
    .single();

  if (!org?.stripe_subscription_id) {
    throw new Error('No active subscription');
  }

  // Cancel at period end (allows access until paid period expires)
  await stripe.subscriptions.update(org.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  return { success: true };
}
```

### Resume Subscription

```typescript
// actions/billing/resume-subscription.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';

export async function resumeSubscription(organizationId: string) {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_subscription_id')
    .eq('id', organizationId)
    .single();

  if (!org?.stripe_subscription_id) {
    throw new Error('No subscription to resume');
  }

  await stripe.subscriptions.update(org.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  return { success: true };
}
```

### Update Subscription (Change Plan)

```typescript
// actions/billing/update-subscription.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';

export async function updateSubscription(
  organizationId: string,
  newPriceId: string
) {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_subscription_id')
    .eq('id', organizationId)
    .single();

  if (!org?.stripe_subscription_id) {
    throw new Error('No active subscription');
  }

  const subscription = await stripe.subscriptions.retrieve(
    org.stripe_subscription_id
  );

  await stripe.subscriptions.update(org.stripe_subscription_id, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  });

  return { success: true };
}
```

---

## Billing Portal

### Create Portal Session

```typescript
// actions/billing/create-portal-session.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';
import { redirect } from 'next/navigation';

export async function createPortalSession(organizationId: string) {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', organizationId)
    .single();

  if (!org?.stripe_customer_id) {
    throw new Error('No Stripe customer');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  });

  redirect(session.url);
}
```

### Billing Page

```typescript
// app/(dashboard)/dashboard/billing/page.tsx
import { createClient } from '@/lib/supabase/server';
import { createPortalSession } from '@/actions/billing/create-portal-session';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get current organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization:organizations(*)')
    .eq('user_id', user!.id)
    .single();

  const org = membership?.organization;

  if (!org) {
    return <div>No organization found</div>;
  }

  const isSubscribed = org.subscription_status === 'active';

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">Billing & Subscription</h1>

      <Card className="p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">Current Plan</h2>
            <p className="text-gray-600 capitalize">{org.subscription_tier}</p>
          </div>
          <div>
            <span className={`px-3 py-1 rounded-full text-sm ${
              isSubscribed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {org.subscription_status}
            </span>
          </div>
        </div>

        {isSubscribed && (
          <p className="text-sm text-gray-600 mb-4">
            Next billing date: {new Date(org.subscription_period_end).toLocaleDateString()}
          </p>
        )}

        <form action={createPortalSession.bind(null, org.id)}>
          <Button type="submit">
            Manage Subscription
          </Button>
        </form>
      </Card>

      {!isSubscribed && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Upgrade Your Plan</h3>
          <p className="text-gray-600 mb-4">
            Get access to more features and increase your limits.
          </p>
          <Button asChild>
            <a href="/pricing">View Plans</a>
          </Button>
        </Card>
      )}
    </div>
  );
}
```

---

## Usage-Based Billing

### Track Usage

```typescript
// lib/billing/track-usage.ts
import { createClient } from '@/lib/supabase/server';

export async function trackUsage(
  organizationId: string,
  metric: string,
  value: number = 1
) {
  const supabase = await createClient();

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Upsert usage record
  await supabase.from('usage_records').upsert({
    organization_id: organizationId,
    metric,
    value,
    period_start: periodStart.toISOString().split('T')[0],
    period_end: periodEnd.toISOString().split('T')[0],
  }, {
    onConflict: 'organization_id,metric,period_start',
  });
}

// Usage
await trackUsage(orgId, 'api_calls', 1);
await trackUsage(orgId, 'storage_mb', fileSizeMB);
```

### Check Usage Limits

```typescript
// lib/billing/check-limits.ts
import { createClient } from '@/lib/supabase/server';

export async function checkLimit(
  organizationId: string,
  metric: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const supabase = await createClient();

  // Get organization with plan limits
  const { data: org } = await supabase
    .from('organizations')
    .select(`
      *,
      plan:plans(limits)
    `)
    .eq('id', organizationId)
    .single();

  if (!org) {
    return { allowed: false, current: 0, limit: 0 };
  }

  const limits = org.plan?.limits || {};
  const limit = limits[metric];

  if (limit === -1) {
    // Unlimited
    return { allowed: true, current: 0, limit: -1 };
  }

  // Get current usage
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: usage } = await supabase
    .from('usage_records')
    .select('value')
    .eq('organization_id', organizationId)
    .eq('metric', metric)
    .gte('period_start', periodStart.toISOString().split('T')[0])
    .single();

  const current = usage?.value || 0;
  const allowed = current < limit;

  return { allowed, current, limit };
}

// Usage
const { allowed } = await checkLimit(orgId, 'api_calls');
if (!allowed) {
  throw new Error('API call limit reached');
}
```

---

## Testing

### Use Stripe Test Mode

```bash
# Test card numbers
4242 4242 4242 4242  # Success
4000 0000 0000 9995  # Declined
4000 0025 0000 3155  # 3D Secure required
```

### Test Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
```

---

## Best Practices

### Security
- ✅ Verify webhook signatures
- ✅ Never expose secret key to client
- ✅ Use environment variables
- ✅ Validate user permissions before billing operations
- ✅ Log all billing events

### User Experience
- ✅ Show clear pricing
- ✅ Display usage metrics
- ✅ Warn before hitting limits
- ✅ Allow easy upgrades/downgrades
- ✅ Send billing notifications
- ✅ Provide invoice access
- ✅ Make cancellation simple

### Development
- ✅ Test webhook handlers thoroughly
- ✅ Handle failed payments gracefully
- ✅ Implement retry logic
- ✅ Monitor subscription health
- ✅ Keep Stripe product/price IDs in database
- ✅ Use idempotency keys for critical operations

---

This comprehensive guide covers Stripe billing integration for Next.js + Supabase SaaS applications. Always test billing flows thoroughly before going live!

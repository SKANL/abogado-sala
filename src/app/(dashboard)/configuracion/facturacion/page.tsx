import { SubscriptionStatus } from "@/features/billing/components/subscription-status";
import { PricingTable } from "@/features/billing/components/pricing-table";
import { Separator } from "@/components/ui/separator";
import { getSubscriptionAction } from "@/features/billing/actions";
import { PageHeader } from "@/components/ui/page-header";

export default async function BillingPage() {
    const result = await getSubscriptionAction();
    const subscription = result.success ? result.data : null;

    // Fallback if no data (should not happen if middleware works)
    const planTier = subscription?.plan_tier || "free";
    const status = subscription?.status || "active";
    const trialEndsAt = subscription?.trial_ends_at;

    return (
        <div className="space-y-8 max-w-5xl">
            <PageHeader
                title="Facturación y Planes"
                description="Gestiona tu suscripción y métodos de pago."
            />

            <SubscriptionStatus 
                planTier={planTier}
                status={status}
                trialEndsAt={trialEndsAt}
                currentPeriodEnd={null} // Stripe sync needed for this
            />

            <Separator className="my-8" />

            <div className="space-y-6">
                <h2 className="text-xl font-semibold">Planes Disponibles</h2>
                <PricingTable />
            </div>
        </div>
    );
}

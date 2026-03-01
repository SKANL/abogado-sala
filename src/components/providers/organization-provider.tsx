
"use client";

import { createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertTriangle, Mail } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/logo";
import { BILLING_MODE, BILLING_CONTACT, BLOCK_ON_PAST_DUE } from "@/lib/billing-config";
import Link from "next/link";

interface Organization {
    id: string;
    name: string;
    slug: string;
    // Extensible role system — future roles (paralegal, secretary, accountant) slot in here.
    role: "owner" | "admin" | "member";
    plan_tier: "free" | "pro" | "enterprise" | "trial" | "basic";
    // "expired" is a computed status (not stored in DB) injected by getOrganizationDetailsAction
    // when plan_status = "trialing" but trial_ends_at has passed.
    plan_status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "expired";
    trial_ends_at?: string;
}

interface OrganizationContextType {
    organization: Organization;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

/** Payment wall shown when the org subscription is locked (canceled/unpaid). */
function PaymentWall({ organization }: { organization: Organization }) {
    const router = useRouter();
    const isOwner = organization.role === "owner";

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-6">
                {/* Branding */}
                <div className="flex justify-center">
                    <Logo variant="full" size="default" />
                </div>

                <Card className="border-destructive/30 bg-destructive/5">
                    <CardHeader className="text-center pb-3">
                        <div className="flex justify-center mb-3">
                            <div className="rounded-full bg-destructive/10 p-3">
                                <AlertTriangle className="w-8 h-8 text-destructive" />
                            </div>
                        </div>
                        <CardTitle className="text-xl">
                            {organization.plan_status === "expired"
                                ? "Período de Prueba Finalizado"
                                : "Suscripción Suspendida"}
                        </CardTitle>
                        <CardDescription>
                            {organization.plan_status === "expired" ? (
                                <>Tu período de prueba gratuito de <strong className="text-foreground">{organization.name}</strong> ha finalizado.</>
                            ) : (
                                <>La cuenta de <strong className="text-foreground">{organization.name}</strong> tiene pagos pendientes o ha expirado.</>
                            )}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {isOwner ? (
                            <p className="text-sm text-muted-foreground text-center">
                                {organization.plan_status === "expired"
                                    ? "Tu período de prueba ha concluido. Contáctanos para activar tu plan y continuar usando el despacho."
                                    : "Como propietario, puedes regularizar el pago para restablecer el acceso a todos los miembros del despacho."}
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center">
                                Contacta al administrador del despacho para que regularice el pago y restablecer el acceso.
                            </p>
                        )}
                    </CardContent>

                    <CardFooter className="flex-col gap-3">
                        {isOwner && (
                            <>
                                {/* Always show billing page link for owner */}
                                <Button className="w-full" onClick={() => router.push("/configuracion/facturacion")}>
                                    Ir a Facturación
                                </Button>

                                {/* Manual billing: show contact buttons */}
                                {BILLING_MODE === "manual" && BILLING_CONTACT.email && (
                                    <Button asChild variant="outline" className="w-full">
                                        <Link href={`mailto:${BILLING_CONTACT.email}?subject=Reactivar%20cuenta%20${encodeURIComponent(organization.name)}`}>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Contactar soporte
                                        </Link>
                                    </Button>
                                )}
                            </>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

export function OrganizationProvider({
    organization,
    children,
}: {
    organization: Organization;
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    // BILLING ENFORCEMENT: block all routes except the billing config page
    const isBillingPage = pathname.startsWith("/configuracion");
    const isLocked =
        organization.plan_status === "canceled" ||
        organization.plan_status === "unpaid" ||
        organization.plan_status === "expired" ||
        // past_due blocks only when explicitly configured (BLOCK_ON_PAST_DUE = true).
        // Keep false for manual-billing grace periods; flip to true when using Stripe retries.
        (BLOCK_ON_PAST_DUE && organization.plan_status === "past_due");

    if (isLocked && !isBillingPage) {
        return <PaymentWall organization={organization} />;
    }

    return (
        <OrganizationContext.Provider value={{ organization }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error("useOrganization must be used within an OrganizationProvider");
    }
    return context;
}

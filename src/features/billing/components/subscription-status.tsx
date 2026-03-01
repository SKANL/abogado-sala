
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Clock, Mail } from "lucide-react";
import { BILLING_MODE, BILLING_CONTACT, PLAN_LABELS, PLAN_STATUS_LABELS } from "@/lib/billing-config";
import Link from "next/link";

interface SubscriptionStatusProps {
    planTier: string;
    status: string;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string | null;
}

function StatusIcon({ status }: { status: string }) {
    if (status === "active") return <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    if (status === "trialing") return <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    return <AlertTriangle className="w-5 h-5 text-destructive" />;
}

export function SubscriptionStatus({ planTier, status, trialEndsAt, currentPeriodEnd }: SubscriptionStatusProps) {
    const isActive = status === "active" || status === "trialing";
    const isTrial = status === "trialing";
    const statusInfo = PLAN_STATUS_LABELS[status] ?? { label: status, description: "" };
    const planDisplay = PLAN_LABELS[planTier] ?? planTier;

    return (
        <Card className={isActive ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"}>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl">Plan Actual</CardTitle>
                        <CardDescription>Estado de tu suscripción</CardDescription>
                    </div>
                    <Badge
                        variant={isActive ? "default" : "destructive"}
                        className="uppercase text-xs"
                    >
                        {planDisplay}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                    <StatusIcon status={status} />
                    <div>
                        <p className="font-medium">{statusInfo.label}</p>
                        <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
                    </div>
                </div>

                {isTrial && trialEndsAt && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            Prueba gratuita termina el{" "}
                            <strong>{new Date(trialEndsAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</strong>
                        </p>
                    </div>
                )}

                {currentPeriodEnd && status === "active" && (
                    <p className="text-sm text-muted-foreground">
                        Próxima renovación: {new Date(currentPeriodEnd).toLocaleDateString()}
                    </p>
                )}

                {BILLING_MODE === "manual" && (
                    <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Facturación manual</p>
                        <p>{BILLING_CONTACT.message}</p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="gap-3 flex-wrap">
                {BILLING_MODE === "manual" ? (
                    /* MANUAL BILLING: Show contact button */
                    <>
                        {BILLING_CONTACT.email && (
                            <Button asChild variant="default">
                                <Link href={`mailto:${BILLING_CONTACT.email}?subject=Activar%20plan%20AbogadoSala`}>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Contactar para pagar
                                </Link>
                            </Button>
                        )}
                        {BILLING_CONTACT.whatsapp && (
                            <Button asChild variant="outline">
                                <Link
                                    href={`https://wa.me/${BILLING_CONTACT.whatsapp.replace(/\D/g, "")}?text=Hola,%20quiero%20activar%20mi%20plan%20en%20AbogadoSala`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    WhatsApp
                                </Link>
                            </Button>
                        )}
                    </>
                ) : (
                    /* STRIPE MODE (future): Wire createStripePortalAction here */
                    <Button variant="outline" disabled>
                        Gestionar Facturación
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}


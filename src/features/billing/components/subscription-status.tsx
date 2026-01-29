
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, CreditCard } from "lucide-react";
import Link from "next/link";

interface SubscriptionStatusProps {
    planTier: string;
    status: string;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string | null;
}

export function SubscriptionStatus({ planTier, status, trialEndsAt, currentPeriodEnd }: SubscriptionStatusProps) {
    const isActive = status === 'active' || status === 'trialing';
    const isTrial = status === 'trialing';

    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl">Plan Actual</CardTitle>
                        <CardDescription>Detalles de tu suscripción</CardDescription>
                    </div>
                    <Badge variant={isActive ? "default" : "destructive"} className="uppercase">
                        {planTier} {isTrial && "(Prueba)"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                    {isActive ? <CheckCircle2 className="text-green-600 w-5 h-5" /> : <AlertTriangle className="text-red-500 w-5 h-5" />}
                    <span className="font-medium">
                        Estado: {status === 'active' ? 'Activo' : status === 'trialing' ? 'Periodo de Prueba' : 'Suspendido/Cancelado'}
                    </span>
                </div>
                
                {currentPeriodEnd && (
                    <div className="text-sm text-muted-foreground">
                        Próxima renovación: {new Date(currentPeriodEnd).toLocaleDateString()}
                    </div>
                )}

                {isTrial && trialEndsAt && (
                    <div className="text-sm font-semibold text-orange-600">
                        Tu prueba termina el {new Date(trialEndsAt).toLocaleDateString()}.
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 {/* This would normally trigger a Server Action to get a Stripe Portal Link */}
                 <Button className="w-full sm:w-auto" variant="outline">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Gestionar Facturación
                 </Button>
            </CardFooter>
        </Card>
    );
}

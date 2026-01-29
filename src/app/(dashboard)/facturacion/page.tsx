"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const plans = [
    {
        tier: "trial",
        name: "Prueba Gratuita",
        price: "0",
        features: ["1 Usuario", "3 Expedientes", "Almacenamiento 100MB", "Soporte Básico"]
    },
    {
        tier: "pro",
        name: "Profesional",
        price: "29",
        features: ["Usuarios Ilimitados", "Expedientes Ilimitados", "Almacenamiento 50GB", "Soporte Prioritario", "Branding Personalizado"]
    },
    {
        tier: "enterprise",
        name: "Empresarial",
        price: "99",
        features: ["Todo en Pro", "API Access", "SSO", "Dedicated Manager", "Auditoría Avanzada"]
    }
];

export default function BillingPage() {
    const { org } = useAuth();

    return (
        <div className="space-y-6">
            <div>
                 <h3 className="text-lg font-medium">Facturación y Suscripción</h3>
                 <p className="text-sm text-muted-foreground">
                    Gestiona tu plan y método de pago.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {plans.map((plan) => {
                    const isCurrent = org?.plan_tier === plan.tier;
                    return (
                        <Card key={plan.tier} className={`flex flex-col ${isCurrent ? 'border-primary shadow-md' : ''}`}>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>{plan.name}</CardTitle>
                                    {isCurrent && <Badge>Actual</Badge>}
                                </div>
                                <CardDescription>
                                    <span className="text-3xl font-bold">${plan.price}</span> / mes
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-2 text-sm">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center">
                                            <Check className="mr-2 h-4 w-4 text-green-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" variant={isCurrent ? "outline" : "default"} disabled={isCurrent}>
                                    {isCurrent ? "Plan Actual" : "Mejorar Plan"}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

             <Card>
                <CardHeader>
                    <CardTitle>Método de Pago</CardTitle>
                    <CardDescription>
                        Gestiona tus tarjetas de crédito.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-muted p-3 rounded-full">
                             <CreditCard className="h-6 w-6" />
                        </div>
                        <div>
                             <p className="text-sm font-medium">No hay método de pago</p>
                             <p className="text-xs text-muted-foreground">Agrega una tarjeta para suscribirte.</p>
                        </div>
                    </div>
                    <Button variant="outline">Agregar Tarjeta via Stripe</Button>
                </CardContent>
            </Card>
        </div>
    );
}


import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Mail } from "lucide-react";
import { BILLING_MODE, BILLING_CONTACT } from "@/lib/billing-config";
import Link from "next/link";

const plans = [
    {
        key: "basic",
        name: "Básico",
        price: "$29",
        period: "/mes",
        description: "Para abogados independientes.",
        features: ["Hasta 50 expedientes", "1 Abogado", "Portal de Clientes", "Soporte por Email"],
        popular: false,
    },
    {
        key: "pro",
        name: "Pro",
        price: "$79",
        period: "/mes",
        description: "Para despachos en crecimiento.",
        features: ["Expedientes Ilimitados", "Hasta 5 Abogados", "Dashboard Avanzado", "Marca Blanca (Logo)", "Soporte Prioritario"],
        popular: true,
    },
    {
        key: "enterprise",
        name: "Enterprise",
        price: "A consultar",
        period: "",
        description: "Para grandes firmas.",
        features: ["Usuarios Ilimitados", "API Access", "SSO", "Gerente Dedicado", "On-premise"],
        popular: false,
    },
] as const;

function PlanCTA({ planName, popular }: { planName: string; popular: boolean }) {
    if (BILLING_MODE === "manual") {
        // MANUAL BILLING: Contact to subscribe
        const subject = encodeURIComponent(`Quiero contratar el plan ${planName} en AbogadoSala`);
        const body = encodeURIComponent(`Hola, me interesa contratar el plan ${planName}. ¿Podría orientarme con el proceso de pago?`);
        return (
            <Button asChild className="w-full" variant={popular ? "default" : "outline"}>
                <Link href={`mailto:${BILLING_CONTACT.email}?subject=${subject}&body=${body}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Contactar para contratar
                </Link>
            </Button>
        );
    }
    // STRIPE MODE (future): Replace with createCheckoutSessionAction call
    return (
        <Button className="w-full" variant={popular ? "default" : "outline"} disabled>
            Elegir {planName}
        </Button>
    );
}

export function PricingTable() {
    return (
        <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
                <Card
                    key={plan.key}
                    className={`flex flex-col relative ${plan.popular ? "border-primary shadow-lg md:scale-105" : ""}`}
                >
                    {plan.popular && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                            Más popular
                        </Badge>
                    )}
                    <CardHeader>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                        <div className="pt-4">
                            <span className="text-4xl font-bold">{plan.price}</span>
                            <span className="text-muted-foreground">{plan.period}</span>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ul className="space-y-2">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2 text-sm">
                                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <PlanCTA planName={plan.name} popular={plan.popular} />
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}

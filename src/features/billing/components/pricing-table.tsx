
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function PricingTable() {
  const plans = [
    {
      name: "Básico",
      price: "$29",
      period: "/mes",
      description: "Para abogados independientes.",
      features: ["Hasta 50 expedientes", "1 Abogado", "Portal de Clientes", "Soporte por Email"],
      cta: "Elegir Básico",
      popular: false
    },
    {
      name: "Pro",
      price: "$79",
      period: "/mes",
      description: "Para despachos en crecimiento.",
      features: ["Expedientes Ilimitados", "Hasta 5 Abogados", "Dashboard Avanzado", "Marca Blanca (Logo)", "Soporte Prioritario"],
      cta: "Elegir Pro",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Para grandes firmas.",
      features: ["Usuarios Ilimitados", "API Access", "SSO", "Dedicated Manager", "On-premise option"],
      cta: "Contactar Ventas",
      popular: false
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <Card key={plan.name} className={`flex flex-col ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}>
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
                        <Check className="w-4 h-4 text-green-500" />
                        {feature}
                    </li>
                ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                {plan.cta}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

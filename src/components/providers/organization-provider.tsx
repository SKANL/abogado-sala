
"use client";

import { createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";

interface Organization {
    id: string;
    name: string;
    slug: string;
    role: "owner" | "admin" | "member"; // Current user's role in org
    plan_tier: "free" | "pro" | "enterprise";
    plan_status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
    trial_ends_at?: string;
}

interface OrganizationContextType {
    organization: Organization;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ 
    organization, 
    children 
}: { 
    organization: Organization; 
    children: React.ReactNode 
}) {
    const router = useRouter();
    const pathname = usePathname();

    // BILLING ENFORCEMENT LOGIC
    // If status is canceled/unpaid, BLOCK ACCESS to everything except billing page.
    const isBillingPage = pathname.startsWith("/configuracion/facturacion");
    const isLocked = organization.plan_status === "canceled" || organization.plan_status === "unpaid";

    if (isLocked && !isBillingPage) {
         // Force redirect or render "Payment Wall"
         // Rendering a wall is better UX than a redirect loop
         return (
             <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center space-y-4">
                 <div className="rounded-full bg-red-100 p-3">
                     <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <h1 className="text-2xl font-bold">Suscripción Suspendida</h1>
                 <p className="text-muted-foreground max-w-md">
                     La suscripción de <strong>{organization.name}</strong> ha expirado o tiene pagos pendientes.
                     Para continuar operando, el propietario debe actualizar el método de pago.
                 </p>
                 {organization.role === 'owner' ? (
                     <button 
                        onClick={() => router.push("/configuracion/facturacion")}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90"
                     >
                        Ir a Facturación
                     </button>
                 ) : (
                     <p className="text-sm bg-muted p-2 rounded">
                        Contacta al administrador del despacho.
                     </p>
                 )}
             </div>
         );
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

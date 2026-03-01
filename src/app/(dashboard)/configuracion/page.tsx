import { redirect } from "next/navigation";

/**
 * /configuracion is a route group for billing and future admin sub-sections.
 * Redirect to the billing page by default.
 */
export default function ConfiguracionPage() {
    redirect("/configuracion/facturacion");
}

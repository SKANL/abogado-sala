import { redirect } from "next/navigation";

/**
 * Esta ruta esta deprecada. Redirige a la pagina de facturacion activa.
 * @deprecated Usar /configuracion/facturacion
 */
export default function LegacyBillingPage() {
  redirect("/configuracion/facturacion");
}

import { redirect } from "next/navigation";

/**
 * La ruta raíz del grupo (dashboard) redirige al dashboard principal.
 */
export default function DashboardRootPage() {
  redirect("/dashboard");
}

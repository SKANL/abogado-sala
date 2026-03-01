"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import React from "react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  casos: "Expedientes",
  kanban: "Kanban",
  plantillas: "Plantillas",
  equipo: "Equipo",
  ajustes: "Ajustes",
  perfil: "Mi Perfil",
  configuracion: "Configuración",
  facturacion: "Facturación",
  sala: "Portal",
  new: "Nuevo",
  edit: "Editar",
};

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const router = useRouter();
  const paths = pathname.split("/").filter(Boolean);

  if (paths.length === 0) return <span className="font-semibold">Inicio</span>;

  // Mobile: show a back button when there is more than one path segment
  const showBackButton = paths.length > 1;
  const parentLabel = paths.length > 1
    ? (ROUTE_LABELS[paths[paths.length - 2]] || paths[paths.length - 2])
    : "Atrás";

  return (
    <>
      {/* Mobile back button — only visible on small screens */}
      {showBackButton && (
        <Button
          variant="ghost"
          size="sm"
          className="sm:hidden -ml-2 h-8 gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm capitalize">{parentLabel}</span>
        </Button>
      )}

      {/* Desktop breadcrumb — hidden on small screens */}
      <Breadcrumb className="hidden sm:flex">
        <BreadcrumbList>
          {paths.map((path, index) => {
            const isLast = index === paths.length - 1;
            const label = ROUTE_LABELS[path] || path;
            const displayLabel = path.length > 20 ? `Detalle (${path.substring(0, 6)}...)` : label;

            return (
              <React.Fragment key={path}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="capitalize font-semibold">{displayLabel}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={`/${paths.slice(0, index + 1).join("/")}`} className="capitalize">
                      {displayLabel}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}

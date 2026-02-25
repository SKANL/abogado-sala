"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  casos: "Expedientes",
  plantillas: "Plantillas",
  equipo: "Equipo",
  ajustes: "Ajustes",
  new: "Nuevo",
};

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const paths = pathname.split("/").filter(Boolean);

  if (paths.length === 0) return <span className="font-semibold">Inicio</span>;

  return (
    <Breadcrumb className="hidden sm:flex">
      <BreadcrumbList>
        {paths.map((path, index) => {
          const isLast = index === paths.length - 1;
          const label = ROUTE_LABELS[path] || path; // fallback to raw path if ID or unknown

          // If it's a UUID/ID, truncate or show "Detalle"
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
  );
}

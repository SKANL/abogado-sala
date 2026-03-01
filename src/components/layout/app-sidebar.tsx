"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { Home, Users, UsersRound, Briefcase, Settings, LogOut, FileText, ChevronUp, CreditCard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/features/auth/actions";

/** Items visible to every role */
const baseItems = [
  { title: "Inicio", url: "/dashboard", icon: Home, exact: true },
  { title: "Expedientes", url: "/casos", icon: Briefcase, exact: false },
];

/** Owner/admin-only items */
const ownerItems = [
  { title: "Clientes", url: "/clientes", icon: Users, exact: false },
  { title: "Equipo", url: "/equipo", icon: UsersRound, exact: false },
  { title: "Plantillas", url: "/plantillas", icon: FileText, exact: false },
];

/** Owner/admin settings nav items */
const ownerSettingsItems = [
  { title: "Ajustes", url: "/ajustes", icon: Settings, exact: false },
  { title: "Facturación", url: "/configuracion/facturacion", icon: CreditCard, exact: false },
];

/** Member (lawyer) gets read-only client access but not team/template management */
const memberItems = [
  { title: "Clientes", url: "/clientes", icon: Users, exact: false },
];

import { useOrganization } from "@/components/providers/organization-provider";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const pathname = usePathname();

  const isActive = (url: string, exact = false) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const isOwnerOrAdmin = organization.role === "owner" || organization.role === "admin";
  const items = [
    ...baseItems,
    ...(isOwnerOrAdmin ? ownerItems : memberItems),
  ];

  const displayName = user?.user_metadata?.full_name || user?.email || "Usuario";
  const initials = displayName.charAt(0).toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <Sidebar variant="floating">
      <SidebarHeader className="p-4 border-b">
         <h2 className="text-xl font-bold tracking-tight">{organization.name}</h2>
         <div className="flex items-center gap-2 mt-1">
            {organization.plan_status === 'trialing' && organization.plan_tier === 'trial' ? (
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-blue-50/50 text-blue-700 border-blue-200">
                Periodo de Prueba
              </Badge>
            ) : (
              <>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                  {organization.plan_tier}
                </Badge>
                {organization.plan_status === 'trialing' && (
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border-amber-200">
                    En Prueba
                  </Badge>
                )}
                {organization.plan_status === 'past_due' && (
                  <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-wider">
                    Pago Pendiente
                  </Badge>
                )}
              </>
            )}
         </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url, item.exact)}
                    className="transition-all duration-150"
                  >
                    <Link href={item.url} aria-current={isActive(item.url, item.exact) ? "page" : undefined}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isOwnerOrAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ownerSettingsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url, item.exact)}
                      className="transition-all duration-150"
                    >
                      <Link href={item.url} aria-current={isActive(item.url, item.exact) ? "page" : undefined}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-12 gap-3">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start min-w-0 flex-1 overflow-hidden">
                    <span className="text-sm font-medium truncate leading-tight w-full">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight truncate w-full">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
                <DropdownMenuItem asChild>
                  <Link href="/perfil">Mi Perfil</Link>
                </DropdownMenuItem>
                {isOwnerOrAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/configuracion/facturacion">Facturación</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logoutAction()}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

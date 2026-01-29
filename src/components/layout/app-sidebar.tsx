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
import { useAuth } from "@/components/providers/auth-provider";
import { Home, Users, Briefcase, Settings, LogOut, FileText } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/features/auth/actions"; // We need to export logout from auth actions

// Placeholder items
const items = [
  {
    title: "Inicio",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
  },
  {
    title: "Expedientes",
    url: "/casos",
    icon: Briefcase,
  },
  {
    title: "Equipo",
    url: "/equipo",
    icon: Users,
  },
  {
    title: "Ajustes",
    url: "/ajustes",
    icon: Settings,
  },
  {
      title: "Plantillas",
      url: "/plantillas",
      icon: FileText, // Need to import FileText
  }
];

import { useOrganization } from "@/components/providers/organization-provider";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  
  // Conditionally render based on role (todo)
  
  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
         <h2 className="text-xl font-bold tracking-tight">{organization.name}</h2>
         <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{organization.plan_tier}</Badge>
            {organization.plan_status === 'trialing' && <Badge variant="secondary" className="text-xs">Trial</Badge>}
         </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={() => logoutAction()}>
                    <LogOut />
                    <span>Cerrar Sesión</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

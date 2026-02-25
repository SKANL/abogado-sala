"use client";

import { Plus, FolderPlus, UserPlus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

export function MobileFab() {
  const router = useRouter();

  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden animate-in fade-in slide-in-from-bottom-5 duration-500">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" className="h-14 w-14 rounded-full shadow-xl">
            <Plus className="h-6 w-6" />
            <span className="sr-only">Menú Rápido</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={16} className="w-56 mb-2">
          <DropdownMenuItem onClick={() => router.push("/casos")}>
            <FolderPlus className="mr-2 h-4 w-4" />
            <span>Nuevo Expediente</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/clientes")}>
            <UserPlus className="mr-2 h-4 w-4" />
            <span>Nuevo Cliente</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/equipo")}>
            <Mail className="mr-2 h-4 w-4" />
            <span>Invitar Miembro</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

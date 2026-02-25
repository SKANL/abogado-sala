"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Search, FolderOpen, User, Settings, FileJson, Users } from "lucide-react";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 md:w-40 lg:w-64 md:px-4 md:py-2 md:justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 md:hidden" />
        <span className="hidden lg:inline-flex">Buscar en portal...</span>
        <span className="hidden md:inline-flex lg:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Tipa un comando o busca..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          <CommandGroup heading="Principal">
            <CommandItem onSelect={() => runCommand(() => router.push("/casos"))}>
              <FolderOpen className="mr-2 h-4 w-4" />
              <span>Expedientes</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/clientes"))}>
              <User className="mr-2 h-4 w-4" />
              <span>Clientes</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Configuración">
            <CommandItem onSelect={() => runCommand(() => router.push("/plantillas"))}>
              <FileJson className="mr-2 h-4 w-4" />
              <span>Plantillas</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/equipo"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Equipo</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/ajustes"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Ajustes</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

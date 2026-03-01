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
import { Search, FolderOpen, User, Settings, FileJson, Users, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/providers/organization-provider";

interface SearchResult {
  id: string;
  type: "case" | "client";
  label: string;
  sublabel?: string;
  href: string;
}

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const router = useRouter();
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { organization } = useOrganization();
  const isOwnerOrAdmin = organization.role === "owner" || organization.role === "admin";

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

  // Reset search when closed
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Debounced live search
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const supabase = createClient();
        const searchTerm = `%${query.trim()}%`;

        // 1. Search clients by full_name (primary intent: user types a person's name)
        const { data: clientsData } = await supabase
          .from("clients")
          .select("id, full_name, email")
          .ilike("full_name", searchTerm)
          .limit(5);

        // 2. Find cases whose client matched — search by client_id IN matched clients.
        //    Fall back to token search if no client names matched (direct token lookup).
        const matchedClientIds = (clientsData ?? []).map((c: { id: string }) => c.id);
        const casesQuery = supabase
          .from("cases")
          .select("id, token, status, clients(full_name)")
          .limit(5);

        const { data: casesData } = matchedClientIds.length > 0
          ? await casesQuery.in("client_id", matchedClientIds)
          : await casesQuery.ilike("token", searchTerm); // token fallback

        const caseResults: SearchResult[] = (casesData ?? []).map((c: { id: string; token: string; status: string; clients?: { full_name?: string } | null }) => ({
          id: c.id,
          type: "case",
          label: c.clients?.full_name ?? c.token,
          sublabel: c.token,
          href: `/casos/${c.id}`,
        }));

        const clientResults: SearchResult[] = (clientsData ?? []).map((cl: { id: string; full_name: string; email: string | null }) => ({
          id: cl.id,
          type: "client",
          label: cl.full_name,
          sublabel: cl.email ?? undefined,
          href: `/clientes/${cl.id}`,
        }));

        setResults([...caseResults, ...clientResults]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [query]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const hasResults = results.length > 0;
  const caseResults = results.filter((r) => r.type === "case");
  const clientResults = results.filter((r) => r.type === "client");

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 md:w-40 lg:w-64 md:px-4 md:py-2 md:justify-start rounded-xl bg-background text-sm font-normal text-muted-foreground shadow-none"
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
        <CommandInput
          placeholder="Buscar expediente, cliente, ruta..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {/* Loading indicator */}
          {isSearching && (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </div>
          )}

          {/* Live search results */}
          {!isSearching && hasResults && (
            <>
              {caseResults.length > 0 && (
                <CommandGroup heading="Expedientes">
                  {caseResults.map((r) => (
                    <CommandItem key={r.id} onSelect={() => runCommand(() => router.push(r.href))}>
                      <FolderOpen className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">{r.label}</span>
                      {r.sublabel && r.sublabel !== r.label && (
                        <span className="ml-2 text-xs text-muted-foreground font-mono truncate">{r.sublabel}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {clientResults.length > 0 && (
                <CommandGroup heading="Clientes">
                  {clientResults.map((r) => (
                    <CommandItem key={r.id} onSelect={() => runCommand(() => router.push(r.href))}>
                      <User className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">{r.label}</span>
                      {r.sublabel && (
                        <span className="ml-2 text-xs text-muted-foreground truncate">{r.sublabel}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
            </>
          )}

          {/* No results when actively searching */}
          {!isSearching && query.trim().length >= 2 && !hasResults && (
            <CommandEmpty>Sin resultados para &quot;{query}&quot;.</CommandEmpty>
          )}

          {/* Default navigation (always shown) */}
          <CommandGroup heading="Navegación">
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
            {isOwnerOrAdmin && (
              <CommandItem onSelect={() => runCommand(() => router.push("/plantillas"))}>
                <FileJson className="mr-2 h-4 w-4" />
                <span>Plantillas</span>
              </CommandItem>
            )}
            {isOwnerOrAdmin && (
              <CommandItem onSelect={() => runCommand(() => router.push("/equipo"))}>
                <Users className="mr-2 h-4 w-4" />
                <span>Equipo</span>
              </CommandItem>
            )}
            {isOwnerOrAdmin && (
              <CommandItem onSelect={() => runCommand(() => router.push("/ajustes"))}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Ajustes</span>
              </CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

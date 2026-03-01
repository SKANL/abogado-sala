"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_LABELS, STATUS_CLASSES } from "@/lib/constants";
import { Search, User, Users, Mail, Phone, ExternalLink, X } from "lucide-react";
import Link from "next/link";

interface ClientRow {
  id: string;
  full_name: string;
  status: string;
  email?: string | null;
  phone?: string | null;
}

interface ClientsTableProps {
  clients: ClientRow[];
}

// Status filter options for clients
const CLIENT_FILTER_STATUSES = ["active", "prospect", "archived"] as const;

export function ClientsTable({ clients }: ClientsTableProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.full_name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        (STATUS_LABELS[c.status] ?? c.status).toLowerCase().includes(q)
      );
    });
  }, [clients, query, statusFilter]);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="px-4 pt-4 md:px-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar cliente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-8 h-9"
            aria-label="Buscar clientes"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {query && (
          <p className="text-xs text-muted-foreground mt-1.5">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2 px-4 md:px-5">
        <button
          type="button"
          onClick={() => setStatusFilter(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
            statusFilter === null
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
          }`}
        >
          Todos
        </button>
        {CLIENT_FILTER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              statusFilter === s
                ? STATUS_CLASSES[s] + " font-semibold"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
            }`}
          >
            {STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>
      <div className="hidden md:block relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Cliente</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <EmptyState
                    icon={Users}
                    title={query ? "Sin resultados" : "No hay clientes"}
                    description={
                      query
                        ? `No se encontraron clientes para "${query}".`
                        : "Aún no has registrado ningún cliente en el despacho."
                    }
                    className="border-none bg-transparent"
                  />
                </TableCell>
              </TableRow>
            )}
            {filtered.map((client) => (
              <TableRow
                key={client.id}
                onClick={() => router.push(`/clientes/${client.id}`)}
                className="group cursor-pointer transition-colors hover:bg-muted/40"
              >
                <TableCell>
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button
                        variant="link"
                        className="p-0 h-auto font-medium justify-start text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {client.full_name}
                        </div>
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80" side="right">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">{client.full_name}</h4>
                        <div className="flex items-center pt-2">
                          <Mail className="mr-2 h-4 w-4 opacity-70" />
                          <span className="text-xs text-muted-foreground">
                            {client.email || "Sin email registrado"}
                          </span>
                        </div>
                        <div className="flex items-center pt-2">
                          <Phone className="mr-2 h-4 w-4 opacity-70" />
                          <span className="text-xs text-muted-foreground">
                            {client.phone || "Sin teléfono registrado"}
                          </span>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {client.email ? (
                    <span className="text-sm text-muted-foreground truncate max-w-50 block">
                      {client.email}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">Sin email</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={client.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Link href={`/clientes/${client.id}`}>
                      <ExternalLink className="h-4 w-4" />
                      <span className="sr-only">Ver Perfil</span>
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden flex flex-col gap-3 px-4 pb-4">
        {filtered.length === 0 && (
          <EmptyState
            icon={Users}
            title={query ? "Sin resultados" : "No hay clientes"}
            description={
              query ? `No se encontraron clientes para "${query}".` : "Aún no has registrado clientes."
            }
            className="bg-background"
          />
        )}
        {filtered.map((client) => (
          <Card key={client.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    {client.full_name}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-col gap-1 mt-1">
                    {client.email && <span>{client.email}</span>}
                    {client.phone && <span>{client.phone}</span>}
                  </div>
                </div>
                <StatusBadge status={client.status} />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs font-semibold w-full sm:w-auto"
                  asChild
                >
                  <Link href={`/clientes/${client.id}`}>Ver Perfil</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

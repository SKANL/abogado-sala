"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_LABELS, STATUS_CLASSES } from "@/lib/constants";
import { Search, FolderOpen, FileStack, Settings2, X, Copy, Check } from "lucide-react";
import Link from "next/link";

const WIZARD_TOTAL_STEPS = 4;
const STEP_NAMES: Record<number, string> = {
  0: "Bienvenida",
  1: "Consentimiento",
  2: "Información",
  3: "Documentación",
  4: "Finalizado",
};

function CopyableToken({ token }: { token?: string }) {
  const [copied, setCopied] = useState(false);
  const short = token?.substring(0, 8) ?? "—";

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
      <span>{short}…</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Copiar token completo"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{copied ? "¡Copiado!" : "Copiar token"}</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface CaseRow {
  id: string;
  token?: string;
  status: string;
  current_step_index?: number;
  client?: { full_name: string } | null;
}

interface CasesTableProps {
  cases: CaseRow[];
}

function getClientName(c: CaseRow): string {
  if (c.client && typeof c.client === "object" && "full_name" in c.client) {
    return c.client.full_name;
  }
  return "Cliente Desconocido";
}

export function CasesTable({ cases }: CasesTableProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        getClientName(c).toLowerCase().includes(q) ||
        c.token?.toLowerCase().includes(q) ||
        (STATUS_LABELS[c.status] ?? c.status).toLowerCase().includes(q)
    );
  }, [cases, query]);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="px-4 pt-4 md:px-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar expediente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-8 h-9"
            aria-label="Buscar expedientes"
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

      {/* Desktop Table */}
      <div className="hidden md:block relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Token/Ref</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <EmptyState
                    icon={FileStack}
                    title={query ? "Sin resultados" : "No hay expedientes"}
                    description={
                      query
                        ? `No se encontraron expedientes para "${query}".`
                        : "Crea tu primer expediente para empezar a gestionarlo."
                    }
                    className="border-none bg-transparent"
                  />
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c) => {
              const stepIdx = c.current_step_index ?? 0;
              const progressPct = Math.round((stepIdx / WIZARD_TOTAL_STEPS) * 100);
              const stepName = STEP_NAMES[stepIdx] ?? `Paso ${stepIdx}`;
              return (
                <TableRow
                  key={c.id}
                  onClick={() => router.push(`/casos/${c.id}`)}
                  className="group cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      {getClientName(c)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <CopyableToken token={c.token} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_CLASSES[c.status] ?? ""}>
                      {STATUS_LABELS[c.status] || c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-32.5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{stepName}</span>
                        <span className="text-xs font-medium tabular-nums">{progressPct}%</span>
                      </div>
                      <Progress value={progressPct} className="h-1.5" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Link href={`/casos/${c.id}`}>
                            <Settings2 className="h-4 w-4" />
                            <span className="sr-only">Gestionar</span>
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Gestionar Expediente</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden flex flex-col gap-3 px-4 pb-4">
        {filtered.length === 0 && (
          <EmptyState
            icon={FileStack}
            title={query ? "Sin resultados" : "No hay expedientes"}
            description={
              query ? `No se encontraron expedientes para "${query}".` : "Crea tu primer expediente."
            }
            className="bg-background"
          />
        )}
        {filtered.map((c) => (
          <Card key={c.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    {getClientName(c)}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    ref: {c.token?.substring(0, 8)}
                  </div>
                </div>
                <Badge variant="outline" className={STATUS_CLASSES[c.status] ?? ""}>
                  {STATUS_LABELS[c.status] || c.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-muted-foreground">
                  Paso actual:{" "}
                  <span className="font-medium text-foreground">{c.current_step_index}</span>
                </div>
                <Button variant="secondary" size="sm" className="h-8 text-xs font-semibold" asChild>
                  <Link href={`/casos/${c.id}`}>Gestionar</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

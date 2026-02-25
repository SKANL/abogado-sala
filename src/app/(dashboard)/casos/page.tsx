import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FolderOpen } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_LABELS, STATUS_VARIANTS } from "@/lib/constants";

export default async function CasesPage() {
  const supabase = await createClient();
  const { data: cases } = await supabase
    .from("cases")
    .select(`
        *,
        client:clients(full_name)
    `)
    .order("created_at", { ascending: false });

  // Helper for safe client name access
  const getClientName = (c: any) => {
      // Supabase joins return array or object depending on relationship.
      // Usually object for Many-to-One.
      if (typeof c.client === 'object' && c.client !== null && 'full_name' in c.client) {
          return c.client.full_name;
      }
      return "Cliente Desconocido";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Expedientes</h1>
          <p className="text-muted-foreground">Gestiona los trámites en curso.</p>
        </div>
        <Button asChild>
            <Link href="/casos/new">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Expediente
            </Link>
        </Button>
      </div>

     <Card>
        <CardContent className="p-0">
             {/* Desktop View */}
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
                        {cases?.length === 0 && (
                             <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No hay expedientes registrados.
                                </TableCell>
                            </TableRow>
                        )}
                        {cases?.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                        {getClientName(c)}
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                    {c.token?.substring(0, 8)}...
                                </TableCell>
                                <TableCell>
                                    <Badge variant={STATUS_VARIANTS[c.status] || "default"}>
                                        {STATUS_LABELS[c.status] || c.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    Paso {c.current_step_index}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/casos/${c.id}`}>Gestionar</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden grid grid-cols-1 gap-0 sm:gap-4 p-4 sm:p-4 bg-muted/20">
                {cases?.length === 0 && (
                    <div className="p-8 text-center text-sm text-muted-foreground border rounded-lg bg-background">
                        No hay expedientes registrados.
                    </div>
                )}
                <div className="flex flex-col gap-3">
                    {cases?.map((c) => (
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
                                    <Badge variant={STATUS_VARIANTS[c.status] || "default"}>
                                        {STATUS_LABELS[c.status] || c.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between pt-2">
                                    <div className="text-xs text-muted-foreground">
                                        Paso actual: <span className="font-medium text-foreground">{c.current_step_index}</span>
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
        </CardContent>
     </Card>
    </div>
  );
}

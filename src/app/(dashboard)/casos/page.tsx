import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FolderOpen } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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
             <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cliente</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Token/Ref</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Progreso</th>
                             <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {cases?.length === 0 && (
                             <tr>
                                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                    No hay expedientes registrados.
                                </td>
                            </tr>
                        )}
                        {cases?.map((c) => (
                            <tr key={c.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <td className="p-4 align-middle font-medium">
                                    <div className="flex items-center gap-2">
                                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                        {getClientName(c)}
                                    </div>
                                </td>
                                <td className="p-4 align-middle font-mono text-xs text-muted-foreground">
                                    {c.token?.substring(0, 8)}...
                                </td>
                                <td className="p-4 align-middle">
                                    <Badge variant={c.status === 'in_progress' ? 'default' : 'secondary'}>
                                        {c.status}
                                    </Badge>
                                </td>
                                <td className="p-4 align-middle">
                                    Paso {c.current_step_index}
                                </td>
                                <td className="p-4 align-middle">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/casos/${c.id}`}>Gestionar</Link>
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CardContent>
     </Card>
    </div>
  );
}

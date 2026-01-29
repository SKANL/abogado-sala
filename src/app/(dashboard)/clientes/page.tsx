import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// Note: We need to install table component. I will assume it's like standard shadcn.

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestiona tus clientes y prospectos.</p>
        </div>
        <Button asChild>
            <Link href="/clientes/new">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
            </Link>
        </Button>
      </div>

     <Card>
        <CardContent className="p-0">
             {/* Simple Table (Manual/Shadcn style) */}
             <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nombre</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Teléfono</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                             <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {clients?.length === 0 && (
                             <tr>
                                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                    No hay clientes registrados.
                                </td>
                            </tr>
                        )}
                        {clients?.map((client) => (
                            <tr key={client.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <td className="p-4 align-middle font-medium">{client.full_name}</td>
                                <td className="p-4 align-middle">{client.email || "-"}</td>
                                <td className="p-4 align-middle">{client.phone || "-"}</td>
                                <td className="p-4 align-middle">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        client.status === 'active' ? 'bg-green-100 text-green-800' :
                                        client.status === 'prospect' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {client.status}
                                    </span>
                                </td>
                                <td className="p-4 align-middle">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/clientes/${client.id}`}>Ver</Link>
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

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, User, Search, Users, Mail, Phone, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_VARIANTS } from "@/lib/constants";
import { EmptyState } from "@/components/ui/empty-state";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

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
             {/* Desktop View */}
             <div className="hidden md:block relative w-full overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre del Cliente</TableHead>
                            <TableHead>Estado</TableHead>
                             <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients?.length === 0 && (
                             <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center">
                                    <EmptyState 
                                        icon={Users} 
                                        title="No hay clientes" 
                                        description="Aún no has registrado ningún cliente en el despacho." 
                                        className="border-none bg-transparent"
                                    />
                                </TableCell>
                            </TableRow>
                        )}
                        {clients?.map((client) => (
                            <TableRow key={client.id}>
                                <TableCell>
                                    <HoverCard>
                                        <HoverCardTrigger asChild>
                                            <Button variant="link" className="p-0 h-auto font-medium justify-start text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    {client.full_name}
                                                </div>
                                            </Button>
                                        </HoverCardTrigger>
                                        <HoverCardContent className="w-80" side="right">
                                            <div className="flex justify-between space-x-4">
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-semibold">{client.full_name}</h4>
                                                    <div className="flex items-center pt-2">
                                                        <Mail className="mr-2 h-4 w-4 opacity-70" />{" "}
                                                        <span className="text-xs text-muted-foreground">
                                                            {client.email || "Sin email registrado"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center pt-2">
                                                        <Phone className="mr-2 h-4 w-4 opacity-70" />{" "}
                                                        <span className="text-xs text-muted-foreground">
                                                            {client.phone || "Sin teléfono registrado"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </HoverCardContent>
                                    </HoverCard>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={STATUS_VARIANTS[client.status] || "default"}>
                                        {STATUS_LABELS[client.status] || client.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" asChild>
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

            {/* Mobile View */}
            <div className="md:hidden grid grid-cols-1 gap-0 sm:gap-4 p-4 sm:p-4 bg-muted/20">
                {clients?.length === 0 && (
                    <EmptyState 
                        icon={Users} 
                        title="No hay clientes" 
                        description="Aún no has registrado clientes." 
                        className="bg-background"
                    />
                )}
                <div className="flex flex-col gap-3">
                    {clients?.map((client) => (
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
                                    <Badge variant={STATUS_VARIANTS[client.status] || "default"}>
                                        {STATUS_LABELS[client.status] || client.status}
                                    </Badge>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button variant="secondary" size="sm" className="h-8 text-xs font-semibold w-full sm:w-auto" asChild>
                                        <Link href={`/clientes/${client.id}`}>Ver Perfil</Link>
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

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientForm } from "@/features/clients/components/client-form";
import { Badge } from "@/components/ui/badge";
import { FileText, User } from "lucide-react";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { id } = await params;

    // 1. Fetch Client
    const { data: client } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

    if (!client) {
        notFound();
    }

    // 2. Fetch Cases
    const { data: cases } = await supabase
        .from("cases")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">{client.full_name}</h1>
                    <div className="flex items-center gap-2">
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                            {client.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground italic">
                            Registrado el {new Date(client.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="details" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="details" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Detalles
                    </TabsTrigger>
                    <TabsTrigger value="cases" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Expedientes ({cases?.length || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información del Cliente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ClientForm initialData={client} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="cases">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Expedientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {cases && cases.length > 0 ? (
                                <div className="space-y-4">
                                    {cases.map((c) => (
                                        <div key={c.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div>
                                                <p className="font-medium">Expediente #{c.id.slice(0, 8)}</p>
                                                <p className="text-sm text-muted-foreground">Estado: {c.status}</p>
                                            </div>
                                            <Badge variant="outline">
                                                {new Date(c.created_at).toLocaleDateString()}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Este cliente no tiene expedientes registrados.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Copy, ExternalLink, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CopyLinkButton } from "@/features/cases/components/copy-link-button";

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: c, error } = await supabase
    .from("cases")
    .select(`
        *,
        client:clients(*),
        files:case_files(*)
    `)
    .eq("id", id)
    .single();

  if (error || !c) {
      notFound();
  }

  // Calculate URL for client portal
  const portalUrl = `/sala/${c.token}`;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">Expediente {c.client?.full_name}</h1>
                    <Badge variant={c.status === 'in_progress' ? 'default' : 'outline'}>
                        {c.status}
                    </Badge>
                </div>
                <p className="text-muted-foreground font-mono text-sm">
                    ID: {c.id}
                </p>
            </div>
             <div className="flex items-center gap-2">
                <CopyLinkButton token={c.token} />

                <Button size="sm" asChild>
                    <Link href={portalUrl} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" /> Ver Portal Cliente
                    </Link>
                </Button>
            </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
            {/* Left Column: Details & Client */}
            <div className="space-y-6 md:col-span-2">
                 {/* Files Section */}
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Archivos del Expediente
                        </CardTitle>
                        <CardDescription>Documentos subidos por el cliente o el despacho.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {c.files && c.files.length > 0 ? (
                            <ul className="space-y-2">
                                {c.files.map((file: any) => (
                                    <li key={file.id} className="flex items-center justify-between p-2 border rounded-md text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{file.category || "Sin categoría"}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(file.file_size / 1024).toFixed(1)} KB • {file.status}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Actions like View/Download would go here */}
                                        <Button variant="ghost" size="sm">Ver</Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-md">
                                No hay archivos cargados aún.
                            </div>
                        )}
                    </CardContent>
                 </Card>
            </div>

            {/* Right Column: Meta & Actions */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Información del Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                         <div>
                            <span className="text-muted-foreground block text-xs">Nombre</span>
                            <span className="font-medium">{c.client?.full_name}</span>
                         </div>
                         <div>
                            <span className="text-muted-foreground block text-xs">Email</span>
                            <span>{c.client?.email || "N/A"}</span>
                         </div>
                         <div>
                            <span className="text-muted-foreground block text-xs">Teléfono</span>
                            <span>{c.client?.phone || "N/A"}</span>
                         </div>
                         <div className="pt-2">
                             <Button variant="secondary" size="sm" className="w-full" asChild>
                                <Link href={`/clientes/${c.client_id}`}>Ver Perfil Cliente</Link>
                             </Button>
                         </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Progreso</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Paso Actual</span>
                            <span className="font-bold">{c.current_step_index}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Vencimiento</span>
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Indefinido"}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}

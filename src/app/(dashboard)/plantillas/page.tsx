import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, FileJson, Trash2, Edit } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { deleteTemplateAction } from "@/features/templates/actions";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: templates, error } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
     console.error("Error fetching templates:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Plantillas</h2>
          <p className="text-muted-foreground">
            Gestiona los modelos de expedientes y formularios.
          </p>
        </div>
        <Link href="/plantillas/new">
            <Button>
            <Plus className="mr-2 h-4 w-4" /> Nueva Plantilla
            </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Desktop View */}
          <div className="hidden md:block relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Alcance</TableHead>
                  <TableHead>Campos</TableHead>
                  <TableHead>Última Actualización</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <FileJson className="h-4 w-4 text-muted-foreground" />
                            {template.title}
                        </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.scope === 'global' ? 'secondary' : 'outline'}>
                        {template.scope === 'global' ? 'Global' : 'Privada'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        {Object.keys(template.schema || {}).length} campos
                    </TableCell>
                    <TableCell>
                        {new Date(template.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/plantillas/${template.id}`}>
                            <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                            </Button>
                        </Link>
                        <form action={async () => {
                            "use server";
                            await deleteTemplateAction(template.id);
                        }}>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!templates?.length && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            No hay plantillas creadas.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden grid grid-cols-1 gap-0 sm:gap-4 p-4 sm:p-4 bg-muted/20">
              {!templates?.length && (
                  <div className="p-8 text-center text-sm text-muted-foreground border rounded-lg bg-background">
                      No hay plantillas creadas.
                  </div>
              )}
              <div className="flex flex-col gap-3">
                  {templates?.map((template) => (
                      <Card key={template.id} className="overflow-hidden">
                          <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                      <div className="font-semibold flex items-center gap-2">
                                          <FileJson className="h-4 w-4 text-primary" />
                                          {template.title}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">
                                          Actualizado: {new Date(template.updated_at).toLocaleDateString()}
                                      </div>
                                  </div>
                                  <Badge variant={template.scope === 'global' ? 'secondary' : 'outline'}>
                                      {template.scope === 'global' ? 'Global' : 'Privada'}
                                  </Badge>
                              </div>
                              <div className="flex items-center justify-between pt-2">
                                  <div className="text-xs text-muted-foreground">
                                      <span className="font-medium text-foreground">{Object.keys(template.schema || {}).length}</span> campos
                                  </div>
                                  <div className="flex justify-end gap-2">
                                      <Button variant="secondary" size="icon" className="h-8 w-8" asChild>
                                          <Link href={`/plantillas/${template.id}`}>
                                              <Edit className="h-4 w-4" />
                                          </Link>
                                      </Button>
                                      <form action={async () => {
                                          "use server";
                                          await deleteTemplateAction(template.id);
                                      }}>
                                          <Button variant="destructive" size="icon" className="h-8 w-8">
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </form>
                                  </div>
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

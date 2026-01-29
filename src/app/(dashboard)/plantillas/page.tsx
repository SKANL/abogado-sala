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

      <div className="rounded-md border">
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
                    {/* Access jsonb schema fields count if possible or just simple text */}
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
                    {/* Delete logic needs client component wrapper or form action */}
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
                    <TableCell colSpan={5} className="h-24 text-center">
                        No hay plantillas creadas.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

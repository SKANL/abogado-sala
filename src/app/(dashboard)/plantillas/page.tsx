import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, FileJson, Edit, FileType2 } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
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
import { DeleteTemplateButton } from "@/features/templates/components/delete-template-button";
import { PageHeader } from "@/components/ui/page-header";

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
    <div className="space-y-4">
      <PageHeader
        title="Plantillas"
        description="Gestiona los modelos de expedientes y formularios."
        action={
          <Button asChild>
            <Link href="/plantillas/new">
              <Plus className="mr-2 h-4 w-4" /> Nueva Plantilla
            </Link>
          </Button>
        }
      />

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
                      <Badge
                        variant={
                          template.scope === "global" ? "secondary" : "outline"
                        }
                      >
                        {template.scope === "global" ? "Global" : "Privada"}
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
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/plantillas/${template.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DeleteTemplateButton
                          templateId={template.id}
                          templateTitle={template.title}
                          variant="default"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!templates?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <EmptyState
                        icon={FileType2}
                        title="No hay plantillas"
                        description="Crea tu primera plantilla para empezar a tramitar expedientes."
                        className="border-none bg-transparent"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden grid grid-cols-1 gap-0 sm:gap-4 p-4 bg-muted/20">
            {!templates?.length && (
              <EmptyState
                icon={FileType2}
                title="No hay plantillas"
                description="Crea tu primera plantilla."
                className="bg-background"
              />
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
                          Actualizado:{" "}
                          {new Date(template.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge
                        variant={
                          template.scope === "global" ? "secondary" : "outline"
                        }
                      >
                        {template.scope === "global" ? "Global" : "Privada"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {Object.keys(template.schema || {}).length}
                        </span>{" "}
                        campos
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <Link href={`/plantillas/${template.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DeleteTemplateButton
                          templateId={template.id}
                          templateTitle={template.title}
                          variant="mobile"
                        />
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

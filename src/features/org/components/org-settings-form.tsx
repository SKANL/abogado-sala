"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateOrganizationAction } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface OrgSettingsFormProps {
  initialData: {
    name: string;
    slug: string;
    logo_url?: string | null;
    primary_color?: string | null;
  };
}

export function OrgSettingsForm({ initialData }: OrgSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await updateOrganizationAction(null, formData);
      if (result.success) {
        toast.success("Organización actualizada");
        router.refresh();
      } else {
        toast.error("Error al actualizar", { description: result.error });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración del Despacho</CardTitle>
        <CardDescription>Personaliza la apariencia y datos de tu organización.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Despacho</Label>
            <Input 
              id="name" 
              name="name" 
              defaultValue={initialData.name} 
              placeholder="Ej. LegalTech Abogados" 
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary_color">Color de Marca (Hex)</Label>
            <div className="flex gap-2">
              <Input 
                id="primary_color" 
                name="primary_color" 
                defaultValue={initialData.primary_color || "#000000"} 
                type="color"
                className="w-12 p-1 h-10" 
              />
              <Input 
                name="primary_color_text"
                defaultValue={initialData.primary_color || "#000000"}
                placeholder="#000000"
                className="font-mono uppercase"
              />
            </div>
          </div>
          
          <div className="space-y-2">
             <Label htmlFor="logo">Logo (URL)</Label>
             <Input 
                id="logo"
                name="logo"
                defaultValue={initialData.logo_url || ""}
                placeholder="https://..."
             />
             <p className="text-xs text-muted-foreground">
                * Por ahora soporta URLs externas. Subida de archivos próximamente.
             </p>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

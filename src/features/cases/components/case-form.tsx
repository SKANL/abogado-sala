"use client";

import { useActionState, useEffect, useState } from "react";
import { createCaseAction } from "@/features/cases/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Result } from "@/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

interface CaseFormProps {
    clients: { id: string, full_name: string }[];
    templates: { id: string, title: string, schema: any }[];
}

const initialState: Result<any> = { success: false, error: "" };

export function CaseForm({ clients, templates }: CaseFormProps) {
    const [state, action, isPending] = useActionState(createCaseAction, initialState);
    const router = useRouter();
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const [templateData, setTemplateData] = useState<Record<string, any>>({});
    
    // Derived selected template schema
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    const schema = selectedTemplate?.schema || {};
    const fields = Object.entries(schema).map(([key, value]: [string, any]) => ({
        id: key,
        ...value
    }));

    useEffect(() => {
        if (state.success) {
            toast.success("Expediente creado correctamente");
            router.push("/casos");
            router.refresh();
        } else if (state.error) {
            toast.error(state.error);
        }
    }, [state, router]);

    const handleFieldChange = (fieldId: string, value: any) => {
        setTemplateData(prev => ({
            ...prev,
            [fieldId]: value
        }));
    };

    return (
        <form action={action} className="space-y-6">
             <div className="space-y-2">
                <Label htmlFor="client_id">Cliente</Label>
                <Select name="client_id" required disabled={isPending}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                        {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                                {client.full_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 {!state.success && state.validationErrors?.client_id && (
                    <p className="text-sm text-destructive">{state.validationErrors.client_id[0]}</p>
                )}
            </div>
            
            <div className="space-y-2">
                 <Label htmlFor="template">Plantilla (Opcional)</Label>
                 <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={isPending}>
                    <SelectTrigger>
                         <SelectValue placeholder="Selecciona una plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                        {templates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
                 <p className="text-[0.8rem] text-muted-foreground">
                    Selecciona una plantilla para cargar campos predefinidos.
                 </p>
            </div>

            {selectedTemplate && (
                <Card className="bg-muted/50 border-dashed">
                    <CardContent className="pt-6 space-y-4">
                        <Label>Datos Específicos del Trámite</Label>
                        {fields.length === 0 && <p className="text-sm text-muted-foreground">Esta plantilla no tiene campos definidos.</p>}
                        
                        {fields.map(field => (
                            <div key={field.id} className="space-y-2">
                                <Label htmlFor={`field_${field.id}`}>
                                    {field.label} {field.required && <span className="text-destructive">*</span>}
                                </Label>
                                {field.type === 'text' && (
                                    <Input 
                                        id={`field_${field.id}`}
                                        required={field.required}
                                        disabled={isPending}
                                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                    />
                                )}
                                {field.type === 'number' && (
                                    <Input 
                                        id={`field_${field.id}`}
                                        type="number"
                                        required={field.required}
                                        disabled={isPending}
                                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                        />
                                )}
                                {field.type === 'date' && (
                                     <Input 
                                        id={`field_${field.id}`}
                                        type="date"
                                        required={field.required}
                                        disabled={isPending}
                                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                    />
                                )}
                                {/* File inputs are usually handled via Portal upload later, 
                                    but we can collect initial expectation here or just show it's required */}
                                {field.type === 'file' && (
                                    <div className="text-sm text-muted-foreground italic border p-2 rounded">
                                        (El documento "{field.label}" será solicitado al cliente en el portal)
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <input type="hidden" name="template_snapshot" value={JSON.stringify(templateData)} />
            
            <div className="space-y-2">
                 <Label htmlFor="status">Estado Inicial</Label>
                 <Select name="status" defaultValue="draft" disabled={isPending}>
                    <SelectTrigger>
                         <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="in_progress">En Progreso</SelectItem>
                    </SelectContent>
                 </Select>
                  {!state.success && state.validationErrors?.status && (
                    <p className="text-sm text-destructive">{state.validationErrors.status[0]}</p>
                )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Creando..." : "Crear Expediente"}
                </Button>
            </div>
        </form>
    );
}

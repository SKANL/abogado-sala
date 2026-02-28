"use client";

import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './sortable-item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createTemplateAction, updateTemplateAction, syncTemplateToCasesAction } from '../actions';
import { toast } from "sonner";
import { useRouter } from 'next/navigation';

type FieldType = 'text' | 'long_text' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'file' | 'separator';

interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  options?: string;
  placeholder?: string;
  description?: string;
}

interface TemplateBuilderProps {
    initialData?: {
        id: string;
        title: string;
        scope: string;
        schema: any;
    };
}

export function TemplateBuilder({ initialData }: TemplateBuilderProps) {
  const router = useRouter();  
  const isEditing = !!initialData;
  const [title, setTitle] = useState(initialData?.title || "Nueva Plantilla");
  const [scope, setScope] = useState(initialData?.scope || "private");
  
  // Initialize fields from schema object and SORT by order
  const initialFields: TemplateField[] = initialData?.schema 
    ? Object.entries(initialData.schema).map(([id, val]: [string, any]) => ({
        id,
        label: val.label,
        type: val.type as FieldType,
        required: !!val.required,
        order: typeof val.order === 'number' ? val.order : 0,
        options: Array.isArray(val.options) ? val.options.join(', ') : '',
        placeholder: val.placeholder || '',
        description: val.description || ''
    })).sort((a, b) => a.order - b.order)
    : [];

  const [fields, setFields] = useState<TemplateField[]>(initialFields);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addField = () => {
    const newField: TemplateField = {
      id: crypto.randomUUID(),
      label: `Campo ${fields.length + 1}`,
      type: 'text',
      required: false,
      order: fields.length,
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Convert fields to schema object
    const schema = fields.reduce((acc, field, index) => {
        acc[field.id] = {
            label: field.label,
            type: field.type,
            required: field.required,
            order: index,
            placeholder: field.placeholder || undefined,
            description: field.description || undefined,
            ...( ['select', 'radio', 'checkbox'].includes(field.type) 
                 ? { options: field.options ? field.options.split(',').map(s => s.trim()).filter(Boolean) : [] } 
                 : {} )
        };
        return acc;
    }, {} as Record<string, any>);

    const formData = new FormData();
    if (isEditing) formData.append("id", initialData.id);
    formData.append("title", title);
    formData.append("scope", scope);
    formData.append("schema", JSON.stringify(schema));

    const action = isEditing ? updateTemplateAction : createTemplateAction;
    const result = await action(null, formData);

    if (result.success) {
        toast.success(isEditing ? "Plantilla actualizada" : "Plantilla creada");
        router.push("/plantillas");
        router.refresh();
    } else {
        toast.error(result.error || "Error al guardar la plantilla");
    }
    setIsSaving(false);
  };

  const handleSync = async () => {
      if (!initialData?.id) return;
      
      const confirmSync = window.confirm(
          "¿Estás seguro de que quieres sincronizar esta plantilla con todos los expedientes activos? Esto actualizará los campos del formulario para los clientes."
      );
      
      if (!confirmSync) return;
      
      setIsSyncing(true);
      const result = await syncTemplateToCasesAction(initialData.id);
      
      if (result.success) {
          toast.success(`Sincronizada con ${result.data?.updatedCount} expediente(s) activo(s).`);
          router.refresh();
      } else {
          toast.error(result.error || "Error al sincronizar");
      }
      setIsSyncing(false);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 h-full">
      <div className="flex flex-col gap-4 min-h-0">
        <Card className="shrink-0">
            <CardHeader>
                <CardTitle>Configuración General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Título de la Plantilla</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Alcance</Label>
                    <Select value={scope} onValueChange={setScope}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="private">Privada</SelectItem>
                            <SelectItem value="global">Global (Org)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>

        <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader className="flex flex-row items-center justify-between shrink-0">
                <CardTitle>Campos del Formulario</CardTitle>
                <Button onClick={addField} size="sm" variant="outline">Agregar Campo</Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext 
                        items={fields.map(f => f.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {fields.map((field) => (
                            <SortableItem key={field.id} id={field.id} onRemove={removeField}>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input 
                                        value={field.label} 
                                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                                        placeholder="Etiqueta del campo"
                                    />
                                    <Select 
                                        value={field.type} 
                                        onValueChange={(val) => updateField(field.id, { type: val as FieldType })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="text">Texto Corto</SelectItem>
                                            <SelectItem value="long_text">Texto Largo</SelectItem>
                                            <SelectItem value="number">Número</SelectItem>
                                            <SelectItem value="date">Fecha</SelectItem>
                                            <SelectItem value="select">Lista Desplegable</SelectItem>
                                            <SelectItem value="radio">Opciones Únicas (Radio)</SelectItem>
                                            <SelectItem value="checkbox">Opción Múltiple (Checkbox)</SelectItem>
                                            <SelectItem value="file">Archivo</SelectItem>
                                            <SelectItem value="separator">Separador de Sección</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {field.type !== 'separator' && (
                                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Placeholder</Label>
                                            <Input 
                                                value={field.placeholder || ''} 
                                                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                                placeholder="Ej. Escribe aquí..."
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Ayuda / Hint</Label>
                                            <Input 
                                                value={field.description || ''} 
                                                onChange={(e) => updateField(field.id, { description: e.target.value })}
                                                placeholder="Instrucciones breves..."
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                                {['select', 'radio', 'checkbox'].includes(field.type) && (
                                   <div className="mt-2 space-y-2">
                                       <Label className="text-xs text-muted-foreground">Opciones (separadas por coma)</Label>
                                       <Input 
                                           value={field.options || ''} 
                                           onChange={(e) => updateField(field.id, { options: e.target.value })}
                                           placeholder="Opción 1, Opción 2, Opción 3..."
                                           className="h-8 text-sm"
                                       />
                                   </div>
                                )}
                            </SortableItem>
                        ))}
                    </SortableContext>
                </DndContext>
                {fields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md mt-4">
                        Agrega campos para construir tu formulario.
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      <div className="flex flex-col min-h-0">
         <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader className="shrink-0">
                <CardTitle>Vista Previa</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 min-h-0 gap-4 pt-0">
                <div className="flex-1 min-h-0 overflow-y-auto border rounded-md bg-muted/20 p-4">
                    <h3 className="text-lg font-bold mb-4">{title}</h3>
                    <div className="space-y-4">
                        {fields.map(field => {
                                if (field.type === 'separator') {
                                    return (
                                        <div key={field.id} className="pt-6 pb-2">
                                            <h4 className="text-lg font-semibold border-b pb-2">{field.label}</h4>
                                            {field.description && <p className="text-sm text-muted-foreground mt-1">{field.description}</p>}
                                        </div>
                                    );
                                }
                                return (
                                    <div key={field.id} className="space-y-2">
                                        <Label>
                                            {field.label} {field.required && <span className="text-destructive">*</span>}
                                        </Label>
                                        
                                        {field.type === 'text' && <Input disabled placeholder={field.placeholder || "Texto..."} />}
                                        {field.type === 'long_text' && <Textarea disabled placeholder={field.placeholder || "Texto largo..."} className="min-h-[80px]" />}
                                        {field.type === 'number' && <Input type="number" disabled placeholder={field.placeholder || "0"} />}
                                        {field.type === 'date' && <Input type="date" disabled />}
                                        {field.type === 'file' && <Input type="file" disabled />}
                                        {field.type === 'select' && (
                                           <Select disabled>
                                               <SelectTrigger><SelectValue placeholder={field.placeholder || "Seleccionar..."} /></SelectTrigger>
                                           </Select>
                                        )}
                                        {field.type === 'radio' && (
                                           <div className="flex flex-col gap-2 mt-2">
                                               {(field.options ? field.options.split(',').filter(Boolean) : ['Opción 1']).map((opt, i) => (
                                                   <div key={i} className="flex items-center gap-2">
                                                       <div className="h-4 w-4 rounded-full border border-primary/50" />
                                                       <Label className="text-sm font-normal">{opt.trim() || 'Opcion'}</Label>
                                                   </div>
                                               ))}
                                           </div>
                                        )}
                                        {field.type === 'checkbox' && (
                                           <div className="flex flex-col gap-2 mt-2">
                                               {(field.options ? field.options.split(',').filter(Boolean) : ['Opción A']).map((opt, i) => (
                                                   <div key={i} className="flex items-center gap-2">
                                                       <div className="h-4 w-4 rounded-sm border border-primary/50" />
                                                       <Label className="text-sm font-normal">{opt.trim() || 'Opcion'}</Label>
                                                   </div>
                                               ))}
                                           </div>
                                        )}
                                        
                                        {field.description && (
                                            <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                                        )}
                                    </div>
                                );
                        })}
                        {fields.length === 0 && <p className="text-sm text-muted-foreground">La vista previa aparecerá aquí.</p>}
                    </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                    <Button className="w-full" onClick={handleSave} disabled={isSaving || isSyncing}>
                        {isSaving ? "Guardando..." : "Guardar Plantilla"}
                    </Button>
                    {isEditing && (
                        <Button 
                            variant="secondary" 
                            className="w-full" 
                            onClick={handleSync} 
                            disabled={isSaving || isSyncing}
                        >
                            {isSyncing ? "Sincronizando..." : "Sincronizar Expedientes Activos"}
                        </Button>
                    )}
                </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}

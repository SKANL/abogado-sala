"use client";

import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './sortable-item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createTemplateAction } from '../actions';
import { toast } from "sonner";
import { useRouter } from 'next/navigation';

type FieldType = 'text' | 'number' | 'date' | 'file';

interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
}

export function TemplateBuilder() {
  const router = useRouter();  
  const [title, setTitle] = useState("Nueva Plantilla");
  const [scope, setScope] = useState("private");
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
    const schema = fields.reduce((acc, field) => {
        acc[field.id] = {
            label: field.label,
            type: field.type,
            required: field.required
        };
        return acc;
    }, {} as Record<string, any>);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("scope", scope);
    formData.append("schema", JSON.stringify(schema));

    const result = await createTemplateAction(null, formData);

    if (result.success) {
        toast.success("Plantilla creada exitosamente");
        router.push("/plantillas");
    } else {
        toast.error(result.error || "Error al guardar la plantilla");
    }
    setIsSaving(false);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <Card>
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

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Campos del Formulario</CardTitle>
                <Button onClick={addField} size="sm" variant="outline">Agregar Campo</Button>
            </CardHeader>
            <CardContent>
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
                                            <SelectItem value="text">Texto</SelectItem>
                                            <SelectItem value="number">Número</SelectItem>
                                            <SelectItem value="date">Fecha</SelectItem>
                                            <SelectItem value="file">Archivo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
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

      <div className="space-y-6">
         <Card className="sticky top-6">
            <CardHeader>
                <CardTitle>Vista Previa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="border p-4 rounded-md bg-muted/20">
                    <h3 className="text-lg font-bold mb-4">{title}</h3>
                    <div className="space-y-4">
                        {fields.map(field => (
                            <div key={field.id} className="space-y-2">
                                <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                                {field.type === 'text' && <Input disabled placeholder="Texto..." />}
                                {field.type === 'number' && <Input type="number" disabled placeholder="0" />}
                                {field.type === 'date' && <Input type="date" disabled />}
                                {field.type === 'file' && <Input type="file" disabled />}
                            </div>
                        ))}
                        {fields.length === 0 && <p className="text-sm text-muted-foreground">La vista previa aparecerá aquí.</p>}
                    </div>
                </div>
                <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Guardando..." : "Guardar Plantilla"}
                </Button>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}

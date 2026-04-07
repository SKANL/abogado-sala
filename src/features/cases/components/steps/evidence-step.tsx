"use client";

import { useCaseWizard } from "../../store/use-case-wizard";
import { UploadCloud, FileIcon, Trash, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { v4 as uuidv4 } from 'uuid';

export function EvidenceStep() {
    const { evidence, addEvidence, removeEvidence, updateEvidence, testimonies, addTestimony, updateTestimony, removeTestimony } = useCaseWizard();
    const [uploading, setUploading] = useState(false);
    const supabase = createClient();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${uuidv4()}.${fileExt}`;
            const filePath = `wizard-temp/${fileName}`;

            const { data, error } = await supabase.storage
                .from('case-files')
                .upload(filePath, file);

            if (error) throw error;

            addEvidence({
                id: data.path, // We use path as ID for simplicity
                fileUrl: data.path, // This is the storage path, to be linked later
                name: file.name,
                label: "Documento General"
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            alert("Hubo un error al subir el archivo.");
        } finally {
            setUploading(false);
        }
    };

    const handleAddTestimony = () => {
        addTestimony({
            id: Date.now().toString(),
            personName: "",
            personDetails: "",
            declaration: ""
        });
    }

    return (
        <div className="space-y-10">
            {/* Sección Evidencias */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium">Elementos Probatorios</h3>
                    <p className="text-sm text-muted-foreground">Sube documentos o multimedia (PDF, JPG, PNG) al sistema y etiquétalos.</p>
                </div>
                
                <div className="border-2 border-dashed border-primary/20 bg-primary/5 rounded-xl h-48 flex flex-col items-center justify-center relative hover:bg-primary/10 transition-colors">
                    <input 
                        type="file" 
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                    />
                    <UploadCloud className="w-10 h-10 text-primary/50 mb-2" />
                    <p className="text-sm font-medium">{uploading ? 'Subiendo archivo...' : 'Haz click o arrastra archivos aquí'}</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, Imágenes... (Automáticamente sube a case-files)</p>
                </div>

                {evidence.length > 0 && (
                    <div className="space-y-3 mt-6">
                        <Label>Evidencia Adjuntada</Label>
                        {evidence.map(ev => (
                            <div key={ev.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                                <FileIcon className="w-8 h-8 text-blue-500 shrink-0" />
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate">{ev.name}</p>
                                    <Input 
                                        className="h-7 text-xs mt-1 w-full bg-transparent border-dashed"
                                        placeholder="Etiqueta / Clasificación (Ej. Contrato de Arrendamiento)"
                                        value={ev.label}
                                        onChange={(e) => updateEvidence(ev.id, { label: e.target.value })}
                                    />
                                </div>
                                <Button variant="ghost" size="icon" className="text-red-500 shrink-0" onClick={() => removeEvidence(ev.id)}>
                                    <Trash className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sección Testimonios */}
            <div className="space-y-6 pt-4 border-t">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium">Módulo de Declaraciones</h3>
                        <p className="text-sm text-muted-foreground">Añade testimonios o declaraciones verbales asociadas al caso.</p>
                    </div>
                    <Button onClick={handleAddTestimony} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" /> Agregar Testimonio
                    </Button>
                </div>

                <div className="space-y-4">
                    {testimonies.map((testimony, index) => (
                        <Card key={testimony.id}>
                            <CardHeader className="py-4">
                                <CardTitle className="text-sm flex justify-between">
                                    <span>Declaración #{index + 1}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeTestimony(testimony.id)}>
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                                <div className="space-y-2">
                                    <Label>Nombre completo del Declarante</Label>
                                    <Input 
                                        placeholder="Ej. María López" 
                                        value={testimony.personName}
                                        onChange={(e) => updateTestimony(testimony.id, { personName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Datos Generales</Label>
                                    <Input 
                                        placeholder="Edad, Relación con los hechos, etc..." 
                                        value={testimony.personDetails}
                                        onChange={(e) => updateTestimony(testimony.id, { personDetails: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Declaración de los hechos</Label>
                                    <Textarea 
                                        placeholder="Redacta o transcribe la declaración aquí..." 
                                        className="min-h-[100px]"
                                        value={testimony.declaration}
                                        onChange={(e) => updateTestimony(testimony.id, { declaration: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {testimonies.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                            No hay testimonios registrados.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

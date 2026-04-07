"use client";

import { useCaseWizard } from "../../store/use-case-wizard";
import { DocumentEditor } from "../document-generator/document-editor";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Label } from "@/components/ui/label";

const TIPOS_DOCUMENTO = [
  { label: "Demanda", value: "Demanda" },
  { label: "Denuncia", value: "Denuncia" },
  { label: "Amparo", value: "Amparo" },
  { label: "Escrito de Pruebas", value: "Escrito de Pruebas" },
  { label: "Contestación", value: "Contestación" },
  { label: "Recurso de Revisión", value: "Recurso de Revisión" },
];

export function NarrativeStep() {
    const { documentType, setDocumentInfo } = useCaseWizard();

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="space-y-2 shrink-0">
                <h3 className="text-lg font-medium">Borrador del Documento Legal</h3>
                <p className="text-sm text-muted-foreground">Estructura y afina el documento final arrastrando las variables desde el panel.</p>
            </div>
            
            <div className="w-[300px] shrink-0 space-y-2 mb-4">
                <Label>Selección del Tipo de Documento</Label>
                <CreatableCombobox 
                    options={TIPOS_DOCUMENTO}
                    value={documentType}
                    onChange={(val) => setDocumentInfo({ documentType: val })}
                    placeholder="Ej. Demanda, Denuncia..."
                    emptyMessage="Tipo no encontrado."
                />
            </div>

            <div className="flex-1 bg-card border rounded-lg overflow-hidden min-h-[500px]">
                <DocumentEditor />
            </div>
        </div>
    );
}

"use client";

import { useCaseWizard } from "../../store/use-case-wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";

const AREAS_PREDETERMINADAS = [
  { label: "Penal", value: "Penal" },
  { label: "Civil", value: "Civil" },
  { label: "Mercantil", value: "Mercantil" },
  { label: "Laboral", value: "Laboral" },
  { label: "Familiar", value: "Familiar" },
];

const ASUNTOS_PREDETERMINADOS: Record<string, {label: string, value: string}[]> = {
  "Penal": [
    { label: "Homicidio", value: "Homicidio" },
    { label: "Robo", value: "Robo" },
    { label: "Fraude", value: "Fraude" },
  ],
  "Civil": [
    { label: "Arrendamiento", value: "Arrendamiento" },
    { label: "Daño Moral", value: "Daño Moral" },
    { label: "Contratos", value: "Contratos" },
  ],
  "Familiar": [
    { label: "Divorcio", value: "Divorcio" },
    { label: "Pensión Alimenticia", value: "Pensión Alimenticia" },
    { label: "Guarda y Custodia", value: "Guarda y Custodia" },
  ],
  "default": [
    { label: "Amparo", value: "Amparo" },
    { label: "General", value: "General" }
  ]
};

export function GeneralSetupStep({ templates }: { templates: any[] }) {
    const { area, subject, authority, referenceId, setGeneralInfo } = useCaseWizard();

    const currentAsuntos = ASUNTOS_PREDETERMINADOS[area] || ASUNTOS_PREDETERMINADOS["default"];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Área / Materia</Label>
                    <CreatableCombobox 
                        options={AREAS_PREDETERMINADAS}
                        value={area}
                        onChange={(val) => setGeneralInfo({ area: val, subject: "" })}
                        placeholder="Ej. Penal, Civil, Mercantil..."
                        emptyMessage="Materia no encontrada."
                    />
                </div>
                <div className="space-y-2">
                    <Label>Asunto / Subclasificación</Label>
                    <CreatableCombobox 
                        options={currentAsuntos}
                        value={subject}
                        onChange={(val) => setGeneralInfo({ subject: val })}
                        placeholder="Ej. Divorcio Incausado, Pagaré..."
                        emptyMessage="Asunto no encontrado."
                    />
                </div>
                <div className="space-y-2">
                    <Label>Autoridad / Dependencia</Label>
                    <Input 
                        placeholder="Ej. Juzgado 3ro Civil..." 
                        value={authority} 
                        onChange={(e) => setGeneralInfo({ authority: e.target.value })} 
                    />
                </div>
                <div className="space-y-2">
                    <Label>Identificador / Expediente</Label>
                    <Input 
                        placeholder="Generación automática o manual (Ej. EXP-2023-01)" 
                        value={referenceId} 
                        onChange={(e) => setGeneralInfo({ referenceId: e.target.value })} 
                    />
                </div>
            </div>
        </div>
    );
}

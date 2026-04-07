"use client";

import { CaseWizardState } from "../../store/use-case-wizard";
import { GripVertical } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface SidePanelDataProps {
    data: CaseWizardState;
}

const DraggableItem = ({ label, value }: { label: string, value: string }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        // Guardamos el texto plano que queremos que se inserte en el editor
        e.dataTransfer.setData("text/plain", value);
        e.dataTransfer.effectAllowed = "copy";
    };

    if (!value) return null;

    return (
        <div 
            draggable
            onDragStart={handleDragStart}
            className="flex items-center gap-2 p-2 mb-2 bg-background border rounded-md cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm"
        >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col overflow-hidden text-left">
                <span className="text-[10px] font-bold text-primary uppercase leading-tight">{label}</span>
                <span className="text-sm truncate">{value}</span>
            </div>
        </div>
    );
};

export function SidePanelData({ data }: SidePanelDataProps) {
    return (
        <div className="p-4 flex flex-col h-full space-y-4 select-none">
            <div>
                <h3 className="text-lg font-bold">Datos del Expediente</h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Arrastra la información hacia el editor a la derecha.
                </p>
            </div>

            <Accordion type="multiple" defaultValue={["general", "parties", "testimonies"]} className="w-full">
                
                {/* GENERAL SETUP */}
                <AccordionItem value="general">
                    <AccordionTrigger className="text-sm py-2">Generales</AccordionTrigger>
                    <AccordionContent>
                        <div className="py-2">
                            <DraggableItem label="Materia" value={data.area} />
                            <DraggableItem label="Asunto" value={data.subject} />
                            <DraggableItem label="Juzgado / Autoridad" value={data.authority} />
                            <DraggableItem label="Número Expediente" value={data.referenceId} />
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* PARTES */}
                <AccordionItem value="parties">
                    <AccordionTrigger className="text-sm py-2">Partes Involucradas</AccordionTrigger>
                    <AccordionContent>
                        <div className="py-2 space-y-4">
                            {data.parties.map(party => (
                                <div key={party.id}>
                                    <p className="text-xs font-semibold mb-2 ml-1 text-muted-foreground">{party.role}</p>
                                    <DraggableItem label="Nombre Completo" value={party.fullName} />
                                    {/* Si configuramos extras, iterar aquí */}
                                    {Object.entries(party.customFields || {}).map(([key, val]) => (
                                        <DraggableItem key={key} label={key} value={val} />
                                    ))}
                                </div>
                            ))}
                            {data.parties.length === 0 && <p className="text-xs text-muted-foreground">Sin partes añadidas.</p>}
                        </div>
                    </AccordionContent>
                </AccordionItem>

            </Accordion>
        </div>
    );
}

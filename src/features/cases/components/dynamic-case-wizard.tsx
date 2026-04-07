"use client";

import { useCaseWizard } from "../store/use-case-wizard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";

// Pasos placeholders
import { GeneralSetupStep } from "./steps/general-setup-step";
import { PartiesStep } from "./steps/parties-step";
import { EvidenceStep } from "./steps/evidence-step";
import { NarrativeStep } from "./steps/narrative-step";

const steps = [
    { title: "Configuración General", description: "Área y datos base del trámite." },
    { title: "Roles y Partes", description: "Clientes e involucrados." },
    { title: "Pruebas", description: "Archivos y testimonios." },
    { title: "Narrativa y Generación", description: "Redacción final." }
];

interface DynamicCaseWizardProps {
    clients: { id: string, full_name: string }[];
    templates: { id: string, title: string, schema: any }[];
    preselectedClientId?: string;
}

export function DynamicCaseWizard({ clients, templates, preselectedClientId }: DynamicCaseWizardProps) {
    const { currentStep, nextStep, prevStep } = useCaseWizard();

    // Renders the specific step component
    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return <GeneralSetupStep templates={templates} />;
            case 1:
                return <PartiesStep clients={clients} preselectedClientId={preselectedClientId} />;
            case 2:
                return <EvidenceStep />;
            case 3:
                return <NarrativeStep />;
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {/* Stepper Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-4 rounded-lg bg-background border p-6">
                {steps.map((step, index) => {
                    const isActive = currentStep === index;
                    const isCompleted = currentStep > index;

                    return (
                        <div key={index} className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold transition-colors
                                ${isActive ? 'border-primary bg-primary text-primary-foreground' : ''}
                                ${isCompleted ? 'border-primary bg-primary/20 text-primary' : ''}
                                ${!isActive && !isCompleted ? 'border-muted-foreground/30 text-muted-foreground' : ''}
                            `}>
                                {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                            </div>
                            <div className="hidden sm:block">
                                <p className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{step.title}</p>
                                <p className="text-xs text-muted-foreground">{step.description}</p>
                            </div>
                            {index < steps.length - 1 && (
                                <ChevronRight className="w-5 h-5 text-muted ml-2 hidden lg:block" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step Content */}
            <Card className="border-t-4 border-t-primary shadow-lg">
                <CardHeader>
                    <CardTitle>{steps[currentStep].title}</CardTitle>
                    <CardDescription>{steps[currentStep].description}</CardDescription>
                </CardHeader>
                <CardContent className="min-h-[400px]">
                    {renderStepContent()}
                </CardContent>
                <CardFooter className="flex justify-between border-t p-6">
                    <Button 
                        variant="outline" 
                        onClick={prevStep} 
                        disabled={currentStep === 0}
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Atrás
                    </Button>
                    
                    {currentStep < steps.length - 1 ? (
                        <Button onClick={nextStep}>
                            Siguiente <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button className="bg-green-600 hover:bg-green-700">
                            Aprobar y Guardar Expediente
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}

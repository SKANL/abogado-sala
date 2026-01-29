"use client";

import { useState } from "react";
import { CasePublic, advanceStepAction } from "@/features/portal/actions";
import { WelcomeStep } from "./steps/welcome-step";
import { ConsentStep } from "./steps/consent-step";
import { CompletionStep } from "./steps/completion-step";
import { QuestionnaireStep } from "./steps/questionnaire-step";
import { DocumentUploadSlot } from "./document-upload-slot";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PortalWizardProps {
  token: string;
  initialCaseData: CasePublic['case'];
  clientName: string;
  files: CasePublic['files'];
}

export function PortalWizard({ token, initialCaseData, clientName, files }: PortalWizardProps) {
  const router = useRouter();
  
  // NOTE: Schema-driven would be more dynamic, but for now we map:
  // 0 -> Welcome
  // 1 -> Consent
  // 2 -> Questionnaire (New)
  // 3 -> Docs
  // 4 -> Done
  const [currentStep, setCurrentStep] = useState(initialCaseData.current_step_index || 0);

  const stepsMetadata = [
    { title: "Bienvenida", description: "Inicio" },
    { title: "Consentimiento", description: "Términos Legales" },
    { title: "Información", description: "Datos Básicos" },
    { title: "Documentación", description: "Carga de Archivos" },
    { title: "Finalizado", description: "Revisión" },
  ];

  const totalSteps = stepsMetadata.length - 1; 
  const progress = (currentStep / totalSteps) * 100;

  const handleStepComplete = async (nextStep: number) => {
    // Optimistic update
    setCurrentStep(nextStep);
    
    // Server persistence
    const result = await advanceStepAction(token, nextStep);
    if (!result.success) {
      toast.error("Error guardando progreso", { description: result.error });
    } else {
        router.refresh();
    }
  };

  const areAllFilesUploaded = files.length > 0 && files.every((f: any) => f.status === 'uploaded' || f.status === 'exception');

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Top Bar / Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span className="font-medium text-foreground">
                Paso {currentStep + 1}: {stepsMetadata[currentStep]?.title || 'Procesando'}
            </span>
            <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" /> Seguro y Encriptado
            </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <div className="mt-8">
        {currentStep === 0 && (
          <WelcomeStep 
            clientName={clientName} 
            onNext={() => handleStepComplete(1)} 
          />
        )}

        {currentStep === 1 && (
          <ConsentStep 
            onNext={() => handleStepComplete(2)} 
          />
        )}

        {currentStep === 2 && (
            <QuestionnaireStep 
                templateSnapshot={initialCaseData.template_snapshot}
                currentAnswers={initialCaseData.questionnaire_answers}
                token={token}
                onNext={() => handleStepComplete(3)}
            />
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
             <div className="text-center space-y-2 mb-6">
                <h1 className="text-2xl font-bold">Documentos Requeridos</h1>
                <p className="text-muted-foreground">Por favor sube los siguientes documentos.</p>
             </div>

             <div className="grid gap-4">
                {files.length > 0 ? (
                    files.map((file: any) => (
                        <DocumentUploadSlot
                            key={file.id}
                            caseId={initialCaseData.id}
                            fileId={file.id}
                            category={file.category}
                            description={file.description}
                            status={file.status}
                            token={token}
                            onSuccess={router.refresh}
                        />
                    ))
                ) : (
                    <Alert>
                        <AlertDescription>No hay documentos pendientes.</AlertDescription>
                    </Alert>
                )}
             </div>

             <div className="flex justify-end pt-6">
                <Button 
                    onClick={() => handleStepComplete(4)}
                    disabled={!areAllFilesUploaded}
                    size="lg"
                >
                    Finalizar y Enviar
                </Button>
             </div>
          </div>
        )}

        {currentStep >= 4 && (
          <CompletionStep />
        )}
      </div>
    </div>
  );
}

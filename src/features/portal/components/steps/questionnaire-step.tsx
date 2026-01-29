"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { submitQuestionnaireAction } from "@/features/portal/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface QuestionnaireStepProps {
  templateSnapshot: any;
  currentAnswers: any;
  token: string;
  onNext: () => void;
}

export function QuestionnaireStep({ templateSnapshot, currentAnswers, token, onNext }: QuestionnaireStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(currentAnswers || {});
  const [submitting, setSubmitting] = useState(false);

  // 1. Extract Questions (filter out 'file' types)
  const questions = Object.entries(templateSnapshot || {})
    .filter(([_, field]: [string, any]) => field.type !== 'file')
    .map(([id, field]: [string, any]) => ({
      id,
      ...field
    }));

  const handleChange = (id: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async () => {
    // Basic validation
    const missingRequired = questions.find(q => q.required && !answers[q.id]);
    if (missingRequired) {
      toast.error(`El campo "${missingRequired.label}" es obligatorio`);
      return;
    }

    setSubmitting(true);
    try {
        const result = await submitQuestionnaireAction(token, answers);
        if (!result.success) {
            throw new Error(result.error);
        }
        onNext();
    } catch (err: any) {
        toast.error("Error al guardar respuestas", { description: err.message });
    } finally {
        setSubmitting(false);
    }
  };

  if (questions.length === 0) {
      // Auto-skip if no questions
      return (
        <div className="text-center py-10">
            <p className="text-muted-foreground mb-4">No hay preguntas adicionales.</p>
            <Button onClick={onNext}>Continuar</Button>
        </div>
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Adicional</CardTitle>
        <CardDescription>Por favor completa la siguiente información para tu expediente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q) => (
            <div key={q.id} className="space-y-2">
                <Label>
                    {q.label} {q.required && <span className="text-red-500">*</span>}
                </Label>
                
                {q.type === 'long_text' ? (
                    <Textarea 
                        value={answers[q.id] || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(q.id, e.target.value)}
                        placeholder="Escribe tu respuesta aquí..."
                    />
                ) : (
                    <Input 
                        type={q.type === 'number' ? 'number' : 'text'}
                        value={answers[q.id] || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(q.id, e.target.value)}
                    />
                )}
            </div>
        ))}

        <div className="flex justify-end pt-4">
            <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar y Continuar
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

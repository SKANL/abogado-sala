"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
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

  // 1. Extract Questions (filter out 'file' types), sorted by saved order
  const questions = Object.entries(templateSnapshot || {})
    .filter(([_, field]: [string, any]) => field.type !== 'file')
    .map(([id, field]: [string, any]) => ({
      id,
      ...field
    }))
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  const handleChange = (id: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async () => {
    // Basic validation
    let isValid = true;
    for (const q of questions) {
        if (q.type === 'separator') continue; // Skip validation for separators
        if (q.required && !answers[q.id]) {
            toast.error(`El campo "${q.label}" es obligatorio`);
            isValid = false;
            break;
        }
    }
    if (!isValid) {
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
        {questions.map((q) => {
            if (q.type === 'separator') {
                return (
                    <div key={q.id} className="pt-6 pb-2">
                        <h4 className="text-lg font-semibold border-b pb-2">{q.label}</h4>
                        {q.description && <p className="text-sm text-muted-foreground mt-1">{q.description}</p>}
                    </div>
                );
            }

            return (
                <div key={q.id} className="space-y-2">
                    <Label>
                        {q.label} {q.required && <span className="text-red-500">*</span>}
                    </Label>
                    
                    {q.type === 'long_text' && (
                        <Textarea 
                            value={answers[q.id] || ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(q.id, e.target.value)}
                            placeholder={q.placeholder || "Escribe tu respuesta aquí..."}
                            className="min-h-[120px] text-base"
                        />
                    )}
                {q.type === 'date' && (
                    <Input 
                        type="date"
                        value={answers[q.id] || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(q.id, e.target.value)}
                        className="h-12 text-base"
                    />
                )}
                {q.type === 'number' && (
                    <Input 
                        type="number"
                        value={answers[q.id] || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(q.id, e.target.value)}
                        placeholder={q.placeholder || "0"}
                        className="h-12 text-base"
                    />
                )}
                {q.type === 'select' && (
                    <Select 
                        value={answers[q.id] || ''} 
                        onValueChange={(val) => handleChange(q.id, val)}
                    >
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder={q.placeholder || "Selecciona una opción"} />
                        </SelectTrigger>
                        <SelectContent>
                            {(q.options ? q.options.join(',') : '').split(',').filter(Boolean).map((opt: string, i: number) => (
                                <SelectItem key={i} value={opt.trim()}>{opt.trim()}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {q.type === 'radio' && (
                    <RadioGroup 
                        value={answers[q.id] || ''} 
                        onValueChange={(val: string) => handleChange(q.id, val)}
                        className="mt-2"
                    >
                        {(q.options ? q.options.join(',') : '').split(',').filter(Boolean).map((opt: string, i: number) => (
                            <div key={i} className="flex items-center space-x-2">
                                <RadioGroupItem value={opt.trim()} id={`${q.id}-${i}`} />
                                <Label htmlFor={`${q.id}-${i}`} className="font-normal">{opt.trim()}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                )}
                {q.type === 'checkbox' && (
                    <div className="flex flex-col gap-2 mt-2">
                        {(q.options ? q.options.join(',') : '').split(',').filter(Boolean).map((opt: string, i: number) => {
                            const trimmedOpt = opt.trim();
                            const currentVals = answers[q.id] ? answers[q.id].split(',').filter(Boolean) : [];
                            const isChecked = currentVals.includes(trimmedOpt);
                            
                            const handleCheck = (checked: boolean) => {
                                let newVals = [...currentVals];
                                if (checked) {
                                    newVals.push(trimmedOpt);
                                } else {
                                    newVals = newVals.filter(v => v !== trimmedOpt);
                                }
                                handleChange(q.id, newVals.join(','));
                            };

                            return (
                                <div key={i} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`${q.id}-${i}`} 
                                        checked={isChecked}
                                        onCheckedChange={handleCheck}
                                    />
                                    <Label htmlFor={`${q.id}-${i}`} className="font-normal">{trimmedOpt}</Label>
                                </div>
                            );
                        })}
                    </div>
                )}
                {(q.type === 'text' || !q.type) && (
                    <Input 
                        type="text"
                        value={answers[q.id] || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(q.id, e.target.value)}
                        placeholder={q.placeholder || ""}
                        className="h-12 text-base"
                    />
                )}

                {q.description && (
                    <p className="text-xs text-muted-foreground mt-1">{q.description}</p>
                )}
            </div>
        );
        })}

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

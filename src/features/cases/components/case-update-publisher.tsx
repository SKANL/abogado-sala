"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Info, Trophy, AlertTriangle, FileQuestion, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { publishCaseUpdateAction } from "@/features/cases/actions/case-updates";

const UPDATE_TYPES = [
  {
    value: "info" as const,
    label: "Información",
    icon: Info,
    accent: "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700",
    activeRing: "ring-2 ring-blue-400",
  },
  {
    value: "milestone" as const,
    label: "Hito logrado",
    icon: Trophy,
    accent: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700",
    activeRing: "ring-2 ring-amber-400",
  },
  {
    value: "warning" as const,
    label: "Aviso",
    icon: AlertTriangle,
    accent: "border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-700",
    activeRing: "ring-2 ring-orange-400",
  },
  {
    value: "document_request" as const,
    label: "Solicitar documento",
    icon: FileQuestion,
    accent: "border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700",
    activeRing: "ring-2 ring-purple-400",
  },
] as const;

type UpdateTypeValue = typeof UPDATE_TYPES[number]["value"];

interface CaseUpdatePublisherProps {
  caseId: string;
}

export function CaseUpdatePublisher({ caseId }: CaseUpdatePublisherProps) {
  const router = useRouter();
  const [type, setType] = useState<UpdateTypeValue>("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      const result = await publishCaseUpdateAction(caseId, title, body || null, type);
      if (result.success) {
        toast.success("Actualización publicada", {
          description: "El cliente podrá verla en su portal.",
        });
        setTitle("");
        setBody("");
        setType("info");
        router.refresh();
      } else {
        toast.error(result.error ?? "No se pudo publicar");
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          Publicar actualización al cliente
        </CardTitle>
        <CardDescription>
          El cliente verá este mensaje en la sección "Estado del Caso" de su portal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tipo de actualización</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {UPDATE_TYPES.map(({ value, label, icon: Icon, accent, activeRing }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-all",
                    "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2",
                    accent,
                    type === value ? activeRing : "opacity-60"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[11px] leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="update-title" className="text-xs text-muted-foreground">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="update-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Tu expediente avanzó a la siguiente etapa"
              disabled={isPending}
              maxLength={200}
              required
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="update-body" className="text-xs text-muted-foreground">
              Detalle (opcional)
            </Label>
            <Textarea
              id="update-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Agrega más contexto si lo necesitas..."
              disabled={isPending}
              rows={3}
              className="resize-none text-sm"
              maxLength={1000}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isPending || !title.trim()} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {isPending ? "Publicando…" : "Publicar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

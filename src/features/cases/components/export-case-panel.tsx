"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, FileArchive, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { requestZipExportAction } from "../actions";

interface ExportCasePanelProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportCasePanel({ caseId, open, onOpenChange }: ExportCasePanelProps) {
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle"); // idle, pending, processing, completed, failed
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const supabase = createClient();

  // Load history when panel opens
  useEffect(() => {
    if (!open) return;
    
    // Reset state for new export attempt
    if (status === "completed" || status === "failed") {
        setStatus("idle");
        setJobId(null);
        setResultUrl(null);
        setErrorMsg(null);
    }

    const fetchHistory = async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("type", "zip_export")
        .contains("metadata", { case_id: caseId })
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (data) {
        setHistory(data);
        // If there's an active job, resume watching it
        const activeJob = data.find(j => j.status === 'pending' || j.status === 'processing');
        if (activeJob) {
          setJobId(activeJob.id);
          setStatus(activeJob.status);
        }
      }
    };
    fetchHistory();
  }, [open, caseId, supabase]);

  // Realtime subscription
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          setStatus(payload.new.status);
          setResultUrl(payload.new.result_url);
          setErrorMsg(payload.new.error_message);
          
          if (payload.new.status === 'completed') {
              toast.success("Exportación completada", { description: "El archivo ZIP está listo para descargar." });
          } else if (payload.new.status === 'failed') {
              toast.error("Exportación fallida", { description: payload.new.error_message });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, supabase]);

  const handleStartExport = async () => {
    setLoading(true);
    setStatus("pending");
    setErrorMsg(null);
    setResultUrl(null);

    try {
      const result = await requestZipExportAction(caseId);
      if (result.success) {
          if (result.data?.job_id) {
            setJobId(result.data.job_id);
            
            // Optimistically add to history
            setHistory(prev => [{
                id: result.data!.job_id,
                status: "pending",
                created_at: new Date().toISOString(),
                type: "zip_export"
            }, ...prev]);
          } else {
            setStatus("failed");
            setErrorMsg("No se devolvió un ID de trabajo válido.");
          }
      } else {
        setStatus("failed");
        setErrorMsg(result.error || "No se pudo crear el trabajo de exportación");
      }
    } catch (e: any) {
      setStatus("failed");
      setErrorMsg(e.message || "Error interno");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "pending": return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">En cola</Badge>;
      case "processing": return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">Procesando</Badge>;
      case "completed": return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Completado</Badge>;
      case "failed": return <Badge variant="destructive">Error</Badge>;
      default: return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col h-full bg-background border-l z-50">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5 text-muted-foreground" />
            Exportar Expediente
          </SheetTitle>
          <SheetDescription>
            Genera un archivo ZIP con todos los documentos y datos de este expediente.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {/* Current Export Status */}
          <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
            <h3 className="font-semibold text-sm">Estado de Exportación</h3>
            
            {status === "idle" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Inicia una nueva exportación para generar el archivo ZIP más actualizado.
                </p>
                <Button onClick={handleStartExport} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileArchive className="h-4 w-4 mr-2" />}
                  Generar Nuevo ZIP
                </Button>
              </div>
            )}

            {(status === "pending" || status === "processing") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {status === "pending" ? "Esperando turno..." : "Comprimiendo archivos..."}
                  </span>
                  {getStatusBadge(status)}
                </div>
                <Progress 
                    value={status === "pending" ? 25 : 75} 
                    className="h-2 w-full animate-pulse" 
                />
              </div>
            )}

            {status === "completed" && resultUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-green-700 dark:text-green-400">Exportación exitosa</span>
                  {getStatusBadge(status)}
                </div>
                <Button className="w-full" asChild>
                  <a href={resultUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar ZIP
                  </a>
                </Button>
                <Button variant="outline" className="w-full" onClick={handleStartExport} disabled={loading}>
                  Generar otro ZIP
                </Button>
              </div>
            )}

            {status === "failed" && (
              <div className="space-y-3">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error en la exportación</AlertTitle>
                  <AlertDescription>{errorMsg || "Ocurrió un error inesperado al generar el ZIP."}</AlertDescription>
                </Alert>
                <Button variant="outline" className="w-full" onClick={handleStartExport} disabled={loading}>
                   Reintentar Exportación
                </Button>
              </div>
            )}
          </div>

          {/* Export History */}
          <div className="space-y-3">
             <h3 className="font-semibold text-sm">Historial de Exportaciones</h3>
             {history.length === 0 ? (
                 <p className="text-sm text-muted-foreground italic">No hay exportaciones previas.</p>
             ) : (
                 <ScrollArea className="h-[300px] pr-4">
                     <div className="space-y-3">
                         {history.map((job) => (
                             <div key={job.id} className="flex flex-col gap-2 p-3 bg-card border rounded-md text-sm shadow-sm">
                                 <div className="flex justify-between items-center">
                                     <span className="text-muted-foreground text-xs">
                                         {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: es })}
                                     </span>
                                     {getStatusBadge(job.status)}
                                 </div>
                                 {job.status === 'completed' && job.result_url && (
                                     <Button variant="ghost" size="sm" className="h-8 justify-start px-2 font-normal text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" asChild>
                                        <a href={job.result_url} target="_blank" rel="noopener noreferrer">
                                            <Download className="h-3 w-3 mr-2" />
                                            Descargar
                                        </a>
                                     </Button>
                                 )}
                                 {job.status === 'failed' && (
                                     <span className="text-xs text-red-500 line-clamp-1">{job.error_message}</span>
                                 )}
                             </div>
                         ))}
                     </div>
                 </ScrollArea>
             )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Loader2, Download, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSignedFileUrlAction } from "@/features/cases/actions";
import { toast } from "sonner";

interface CaseFile {
  id: string;
  category: string;
  description: string | null;
  file_size: number;
  status: string;
  file_key: string | null;
  updated_at: string;
}

interface CaseFilesListProps {
  files: CaseFile[];
}

export function CaseFilesList({ files }: CaseFilesListProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleViewFile = async (file: CaseFile) => {
    if (!file.file_key) {
        toast.error("El archivo aún no se ha subido por completo.");
        return;
    }

    setLoadingId(file.id);
    try {
        const result = await getSignedFileUrlAction(file.file_key);
        if (!result.success) {
            throw new Error(result.error || "No se pudo obtener el archivo");
        }
        
        if (!result.data) {
             throw new Error("Url vacía");
        }

        const extension = file.file_key.split('.').pop()?.toLowerCase();
        let type = 'unknown';
        if (['jpg', 'jpeg', 'png', 'webp'].includes(extension || '')) type = 'image';
        if (extension === 'pdf') type = 'pdf';

        setSelectedFile({
            url: result.data,
            name: file.description || file.category,
            type
        });
        setPreviewOpen(true);

    } catch (error) {
        toast.error("Error al abrir el archivo");
        console.error(error);
    } finally {
        setLoadingId(null);
    }
  };

  if (!files || files.length === 0) {
    return (
        <div className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-md">
            No hay archivos cargados aún.
        </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {files.map((file) => (
          <li key={file.id} className="flex items-center justify-between p-2 border rounded-md text-sm hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-primary/10 text-primary rounded-md flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">{file.description || file.category || "Sin título"}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span className="capitalize">{file.status.replace('_', ' ')}</span>
                    {file.updated_at && (
                        <>
                            <span>•</span>
                            <span>{new Date(file.updated_at).toLocaleDateString()}</span>
                        </>
                    )}
                </div>
              </div>
            </div>
            
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleViewFile(file)}
                disabled={loadingId === file.id || file.status !== 'uploaded'}
                className="gap-2"
            >
                {loadingId === file.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Eye className="h-4 w-4" />
                )}
                Ver
            </Button>
          </li>
        ))}
      </ul>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
            <DialogHeader className="p-4 border-b">
                <DialogTitle className="flex items-center justify-between mr-8">
                    <span>{selectedFile?.name}</span>
                    {selectedFile?.url && (
                         <Button variant="outline" size="sm" asChild>
                            <a href={selectedFile.url} download target="_blank" rel="noreferrer">
                                <Download className="mr-2 h-4 w-4" /> Descargar
                            </a>
                        </Button>
                    )}
                </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 bg-muted/20 relative overflow-hidden flex items-center justify-center p-4">
                {selectedFile?.type === 'image' && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img 
                        src={selectedFile.url} 
                        alt="Preview" 
                        className="max-w-full max-h-full object-contain shadow-lg rounded-md" 
                    />
                )}
                
                {selectedFile?.type === 'pdf' && (
                    <iframe 
                        src={selectedFile.url} 
                        className="w-full h-full rounded-md shadow-sm bg-white" 
                        title="PDF Preview"
                    />
                )}

                {selectedFile?.type === 'unknown' && (
                    <div className="text-center space-y-4">
                        <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                        <p>No hay vista previa disponible para este tipo de archivo.</p>
                        <Button asChild>
                            <a href={selectedFile.url} target="_blank" rel="noreferrer">
                                Abrir en nueva pestaña
                            </a>
                        </Button>
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

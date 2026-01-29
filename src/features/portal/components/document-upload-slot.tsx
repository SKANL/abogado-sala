"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { confirmUploadAction } from "@/features/cases/actions";
import { confirmPortalUploadAction } from "@/features/portal/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UploadCloud, Check, Loader2, Paperclip } from "lucide-react";
import { Input } from "@/components/ui/input";

// Corrected Props based on Requirement: We upload against a specific `case_file` ID (the slot).
interface DocumentUploadSlotProps {
  caseId: string; // Needed for path structure if we want
  fileId: string; // The database ID of the 'case_files' row
  category: string;
  description?: string | null;
  status: "pending" | "uploaded" | "missing" | "rejected";
  token?: string; // Optional: Only for Portal usage
  onSuccess: () => void;
}

export function DocumentUploadSlot({ caseId, fileId, category, description, status, token, onSuccess }: DocumentUploadSlotProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const startUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
        const supabase = createClient();
        const fileExt = file.name.split('.').pop();
        // Secure path: case_id/file_id.ext ensures uniqueness and allows RLS optimization
        const filePath = `${caseId}/${fileId}.${fileExt}`;
        
        // 1. Upload
        const { error: uploadError } = await supabase.storage
            .from('case-files') 
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // 2. Confirm
        let result;
        if (token) {
            // Portal Flow (Explicit Token)
            result = await confirmPortalUploadAction(token, fileId, filePath, file.size);
        } else {
            // Admin/Dashboard Flow (Session Cookie)
            result = await confirmUploadAction(fileId, file.size, filePath);
        }
        
        if (!result.success) {
            throw new Error(result.error || "Error confirmando carga");
        }

        toast.success("Documento subido correctamente");
        setFile(null);
        onSuccess();

    } catch (err: any) {
        console.error("Upload error:", err);
        toast.error(err.message || "Error al subir documento");
    } finally {
        setUploading(false);
    }
  };

  if (status === 'uploaded') {
      return (
          <div className="flex items-center gap-2 text-green-600 border p-3 rounded-md bg-green-50">
              <Check className="h-5 w-5" />
              <span className="text-sm font-medium">Subido y Recibido</span>
          </div>
      );
  }

  return (
    <div className="border border-dashed p-4 rounded-md space-y-3 bg-muted/20 hover:bg-muted/40 transition-colors">
        <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{description || category}</span>
             </div>
             {status === 'missing' && <span className="text-xs text-red-500 font-medium">Requerido</span>}
             {status === 'rejected' && <span className="text-xs text-red-500 font-medium">Rechazado - Subir nuevo</span>}
        </div>
        
        <div className="flex gap-2">
            <Input 
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={uploading}
                className="text-xs file:text-xs h-9"
            />
            <Button 
                size="sm" 
                onClick={startUpload}
                disabled={!file || uploading}
            >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            </Button>
        </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { confirmUploadAction } from "@/features/cases/actions"; // We reuse confirmed upload RPC action
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UploadCloud, Check, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FileUploaderProps {
  caseId: string;
  category: string;
  onUploadSuccess?: () => void;
  acceptedFileTypes?: string; // e.g. "application/pdf,image/*"
}

export function FileUploader({ caseId, category, onUploadSuccess, acceptedFileTypes = "application/pdf,image/jpeg,image/png" }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    try {
      setUploading(true);
      const supabase = createClient();
      
      // 1. Upload to Storage
      // Path format: {org_id}/{case_id}/{category}/{timestamp}_{filename}
      // But we don't know org_id here easily without querying.
      // RLS policy for storage usually uses `auth.uid()` or similar, but for public/token access 
      // we might need a specific bucket Policy that allows inserting if path contains the known case ID?
      // Actually, standard pattern for public upload often involves:
      // a) Signed URL (best security)
      // b) Public bucket with permissive insert (spam risk)
      // c) RPC/Edge Function to handle upload (Stream)
      
      // Given our time constraints, let's assume we use a "case-uploads" bucket 
      // where we structure path as logic dictates.
      // The `master_schema.sql` doesn't explicitly show bucket creation, but implies standard storage.
      // We will assume a bucket "case-files" exists.
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${caseId}/${category}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('case-files')
        .upload(fileName, file);

      if (error) {
        throw new Error(error.message);
      }

      // 2. Confirm Upload in DB (RPC)
      // This is crucial because it links the storage key to the DB record.
      // But wait... the `confirm_file_upload` RPC takes `p_file_id` which implies a row already exists in `case_files` with status 'pending' or similar?
      // Checking `case_files` schema: it has `file_key`.
      // Checking `confirm_file_upload` in `05-functions.sql` (mapped in brain):
      // It updates `case_files` set status='uploaded', file_key=..., file_size=... WHERE id = p_file_id.
      // This implies we must have a PRE-EXISTING record to update.
      // So the flow is: 
      // 1. BE creates "Slot" (case_file row with status 'pending').
      // 2. FE uploads file.
      // 3. FE calls confirm_file_upload(file_id, ...).
      
      // We need the `fileId` prop passed to this component then, matching a specific requested document.
      // Let's adjust props.
    } catch (error: any) {
      toast.error("Error al subir archivo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
       {/* Placeholder for now until we correct the flow in next file */}
       <p>Uploader Logic Placeholder</p>
    </div>
  );
}

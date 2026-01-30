"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  bucket: string;
  folderPath?: string;
  defaultUrl?: string | null;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
  aspectRatio?: "square" | "video" | "auto";
  className?: string;
}

export function ImageUploader({
  bucket,
  folderPath = "",
  defaultUrl,
  onUploadComplete,
  onRemove,
  aspectRatio = "auto",
  className,
}: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(defaultUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Sync preview with defaultUrl or incoming prop changes
  useEffect(() => {
      if (defaultUrl) setPreview(defaultUrl);
  }, [defaultUrl]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen válido");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) { // 5MB
      toast.error("La imagen debe ser menor a 5MB");
      return;
    }

    setFile(selectedFile);
    
    // Create local preview
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);

    // Auto upload
    await uploadFile(selectedFile);
  };

  const uploadFile = async (fileToUpload: File) => {
    setIsUploading(true);
    try {
      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onUploadComplete(publicUrl);
      toast.success("Imagen subida correctamente");

    } catch (error: any) {
      toast.error(`Error al subir imagen: ${error.message}`);
      setFile(null);
      setPreview(defaultUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onRemove) onRemove();
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-4">
        <div 
            className={cn(
                "relative border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden group transition-colors hover:bg-muted/50",
                aspectRatio === "square" ? "w-32 h-32" : 
                aspectRatio === "video" ? "w-64 h-36" : "w-40 h-40",
                !preview && "hover:border-primary/50 cursor-pointer"
            )}
            onClick={() => !preview && fileInputRef.current?.click()}
        >
          {preview ? (
             <>
                <Image 
                    src={preview} 
                    alt="Preview" 
                    fill 
                    className="object-contain p-2" 
                />
                {!isUploading && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                            type="button"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
             </>
          ) : (
            <div className="text-center p-4">
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground font-medium">Click para subir</span>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
            {preview && (
                 <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                    Cambiar Imagen
                </Button>
            )}
            <p className="text-xs text-muted-foreground">
                Recomendado: 400x400px o superior. <br/>
                Max 5MB (PNG, JPG).
            </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KnowledgeDropzoneProps {
  personaId: string;
  onUploadSuccess?: () => void;
}

export function KnowledgeDropzone({ personaId, onUploadSuccess }: KnowledgeDropzoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
      setError(null);
      setSuccess(false);
      setProcessedCount(0);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccess(false);
    setProcessedCount(0);

    let successCount = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(`/api/admin/personas/${personaId}/knowledge`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Upload failed for ${file.name}`);
        
        successCount++;
        setProcessedCount(successCount);
      } catch (err: any) {
        setError(`Error subiendo ${file.name}: ${err.message}`);
        setUploading(false);
        return; // Stop on first error
      }
    }

    setSuccess(true);
    setFiles([]);
    if (onUploadSuccess) onUploadSuccess();
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <div 
        className={`relative border-2 border-dashed rounded-xl p-8 transition-colors text-center
          ${files.length > 0 ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}
        `}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept=".pdf,.txt,.docx,.md,.json"
          disabled={uploading}
          multiple
        />
        
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="w-10 h-10 text-[#71717a]" />
          <p className="text-sm text-[#ededed]">Haz clic o arrastra archivos aquí</p>
          <p className="text-xs text-[#a1a1aa]">PDF, TXT, DOCX, MD o JSON (Máx. 10MB c/u)</p>
        </div>
      </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto px-1">
            {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <span className="text-xs text-zinc-300 truncate">{f.name}</span>
                        <span className="text-[10px] text-zinc-500 flex-shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    {!uploading && (
                        <button onClick={() => removeFile(i)} className="p-1 hover:bg-white/10 rounded transition-colors">
                            <X className="w-3 h-3 text-zinc-500" />
                        </button>
                    )}
                </div>
            ))}
        </div>
      )}

      {files.length > 0 && (
        <Button 
          onClick={handleUpload} 
          disabled={uploading}
          className="w-full shadow-lg h-12 font-bold"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando ({processedCount}/{files.length})...
            </>
          ) : (
            `Subir ${files.length} archivo${files.length > 1 ? 's' : ''} y Entrenar`
          )}
        </Button>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          Conocimiento integrado correctamente.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4" />
          Error: {error}
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { ExternalLink, Upload, FileCheck2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitLessonFile } from "@/app/actions/lesson-submissions";

interface Props {
  lessonId: string;
  url: string | null;
  onSubmitted: () => void;   // desbloquea "Marcar y continuar"
  submitted: boolean;
}

export function LinkLesson({ lessonId, url, onSubmitted, submitted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleFile(f: File) {
    setFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleUpload() {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);

    startTransition(async () => {
      const result = await submitLessonFile(lessonId, fd);
      if (result.success) {
        toast.success("Archivo entregado correctamente.");
        onSubmitted();
        setFile(null);
      } else {
        toast.error(result.message ?? "Error al subir el archivo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Card del enlace externo */}
      {url ? (
        <div className="flex items-center justify-between gap-4 p-5 rounded-xl border border-[var(--color-neutral-200)] bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
              <ExternalLink className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
                Recurso externo
              </p>
              <p className="text-xs text-[var(--color-neutral-500)] truncate">{url}</p>
            </div>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="size-3.5" />
              Ir al recurso
            </Button>
          </a>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-dashed border-[var(--color-neutral-200)] bg-white text-center">
          <p className="text-sm text-[var(--color-neutral-400)]">Sin URL configurada para esta lección.</p>
        </div>
      )}

      {/* Área de entrega */}
      <div className="flex flex-col gap-3 p-5 rounded-xl border border-[var(--color-neutral-200)] bg-white">
        <div>
          <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
            Entrega tu evidencia
          </p>
          <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
            Sube el archivo que demuestre que completaste la actividad. Máx. 20 MB.
          </p>
        </div>

        {submitted && !file && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200">
            <FileCheck2 className="size-4 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-700">Entrega registrada</p>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 p-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-[var(--color-neutral-200)] hover:border-primary/50 hover:bg-[var(--color-neutral-50)]"
          }`}
        >
          <Upload className="size-6 text-[var(--color-neutral-400)]" />
          <p className="text-sm text-[var(--color-neutral-500)]">
            Arrastra tu archivo aquí o{" "}
            <span className="text-primary font-medium">haz clic para seleccionar</span>
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>

        {/* Archivo seleccionado */}
        {file && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]">
            <div className="flex items-center gap-2 min-w-0">
              <FileCheck2 className="size-4 shrink-0 text-[var(--color-neutral-400)]" />
              <span className="text-xs text-[var(--color-neutral-700)] truncate">{file.name}</span>
              <span className="text-xs text-[var(--color-neutral-400)] shrink-0">
                ({(file.size / 1024 / 1024).toFixed(1)} MB)
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="shrink-0 text-[var(--color-neutral-400)] hover:text-red-500 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || pending}
          className="w-full"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Subiendo…
            </>
          ) : (
            <>
              <Upload className="size-4" />
              {submitted ? "Reemplazar entrega" : "Subir archivo"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

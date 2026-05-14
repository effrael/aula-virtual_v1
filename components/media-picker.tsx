"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ImagePlus, Check, Trash2, Upload,
  FileText, FileSpreadsheet, Archive, File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  uploadFile,
  deleteStorageFile,
  listStorageFiles,
  type UploadState,
} from "@/app/actions/storage";
import {
  getFileCategory,
  type StorageFile,
  type FileCategory,
} from "@/lib/storage-utils";
import { formatBytes } from "@/lib/utils";

// ── Icono por tipo ─────────────────────────────────────────────────────────

function FileIcon({ mimetype, className }: { mimetype: string; className?: string }) {
  const category = getFileCategory(mimetype);
  const icons: Record<FileCategory, React.ReactNode> = {
    image: <ImagePlus className={className} />,
    pdf: <FileText className={className} />,
    word: <FileText className={className} />,
    excel: <FileSpreadsheet className={className} />,
    zip: <Archive className={className} />,
    other: <File className={className} />,
  };
  return <>{icons[category]}</>;
}

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  bucket: string;
  value: string | null;
  onChange: (url: string | null) => void;
  initialFiles?: StorageFile[];
  /** Filtra qué archivos se muestran y qué se puede subir. "image" = solo imágenes */
  accept?: "image" | "all";
};

// ── Component ──────────────────────────────────────────────────────────────

export function MediaPicker({
  bucket,
  value,
  onChange,
  initialFiles = [],
  accept = "all",
}: Props) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<StorageFile[]>(initialFiles);
  const [selected, setSelected] = useState<string | null>(value);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAction = uploadFile.bind(null, bucket);
  const [uploadState, formAction, pending] = useActionState<UploadState, FormData>(
    uploadAction,
    undefined
  );

  const acceptAttr =
    accept === "image"
      ? "image/jpeg,image/png,image/webp"
      : "image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip";

  const visibleFiles =
    accept === "image"
      ? files.filter((f) => f.mimetype.startsWith("image/"))
      : files;

  async function refreshFiles() {
    setLoading(true);
    const fresh = await listStorageFiles(bucket);
    setFiles(fresh);
    setLoading(false);
  }

  useEffect(() => {
    if (open) refreshFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (uploadState?.success && uploadState.publicUrl) {
      toast.success("Archivo subido correctamente.");
      refreshFiles();
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    if (uploadState?.message) {
      toast.error(uploadState.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadState]);

  function handleConfirm() {
    onChange(selected);
    setOpen(false);
  }

  async function handleDelete(fileName: string, publicUrl: string) {
    const res = await deleteStorageFile(bucket, fileName);
    if (res.success) {
      toast.success("Archivo eliminado.");
      if (selected === publicUrl) {
        setSelected(null);
        onChange(null);
      }
      refreshFiles();
    } else {
      toast.error(res.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {value ? (
          <button
            type="button"
            className="relative w-full h-40 rounded-lg overflow-hidden border border-[var(--color-neutral-200)] group"
          >
            <img src={value} alt="Portada" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">Cambiar imagen</span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            className="w-full h-40 rounded-lg border-2 border-dashed border-[var(--color-neutral-300)] flex flex-col items-center justify-center gap-2 text-[var(--color-neutral-400)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            <ImagePlus className="size-7" />
            <span className="text-xs">Seleccionar desde biblioteca</span>
            <span className="text-xs opacity-70">o subir nueva imagen</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Biblioteca de medios</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Upload */}
          <form action={formAction}>
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept={acceptAttr}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) e.target.form?.requestSubmit();
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending}
              className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline disabled:opacity-50"
            >
              <Upload className="size-4" />
              {pending ? "Subiendo..." : "Subir archivo"}
            </button>
          </form>

          {/* Grid */}
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-[var(--color-neutral-400)]">
              Cargando...
            </div>
          ) : visibleFiles.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-[var(--color-neutral-400)]">
              <ImagePlus className="size-8" />
              <p className="text-sm">No hay archivos todavía.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
              {visibleFiles.map((file) => {
                const isSelected = selected === file.publicUrl;
                const isImage = file.mimetype.startsWith("image/");

                return (
                  <div
                    key={file.name}
                    className={`relative group rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-[var(--color-primary)]"
                        : "border-transparent hover:border-[var(--color-neutral-300)]"
                    }`}
                    onClick={() => setSelected(isSelected ? null : file.publicUrl)}
                  >
                    {/* Preview */}
                    {isImage ? (
                      <img
                        src={file.publicUrl}
                        alt={file.name}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 bg-[var(--color-neutral-100)] flex flex-col items-center justify-center gap-1">
                        <FileIcon mimetype={file.mimetype} className="size-8 text-[var(--color-neutral-400)]" />
                        <span className="text-xs text-[var(--color-neutral-500)] uppercase font-medium">
                          {file.name.split(".").pop()}
                        </span>
                      </div>
                    )}

                    {/* Check */}
                    {isSelected && (
                      <div className="absolute top-1.5 left-1.5 size-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                        <Check className="size-3 text-white" />
                      </div>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.name, file.publicUrl);
                      }}
                      className="absolute top-1.5 right-1.5 size-5 rounded-full bg-black/60 hidden group-hover:flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                    >
                      <Trash2 className="size-3" />
                    </button>

                    {/* Size */}
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1.5 py-0.5">
                      <p className="text-xs text-white truncate">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-neutral-100)]">
            <p className="text-xs text-[var(--color-neutral-400)]">
              {visibleFiles.length} {visibleFiles.length === 1 ? "archivo" : "archivos"}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!selected}
                className="text-white"
                onClick={handleConfirm}
              >
                Seleccionar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

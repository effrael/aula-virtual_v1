"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Paperclip, Trash2, FileText, FileSpreadsheet, Archive, File, ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaPicker } from "@/components/media-picker";
import { LIBRARY_BUCKET, getFileCategory } from "@/lib/storage-utils";
import {
  getLessonResources,
  addLessonResource,
  removeLessonResource,
  type ResourceRow,
} from "@/app/actions/lesson-resources";
import { formatBytes } from "@/lib/utils";
import type { LessonRow } from "@/lib/queries/modules";

type Props = {
  lesson: LessonRow;
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ResourceIcon({ mimetype }: { mimetype: string }) {
  const cat = getFileCategory(mimetype);
  const cls = "size-4";
  if (cat === "image") return <ImageIcon className={cls} />;
  if (cat === "pdf" || cat === "word") return <FileText className={cls} />;
  if (cat === "excel") return <FileSpreadsheet className={cls} />;
  if (cat === "zip") return <Archive className={cls} />;
  return <File className={cls} />;
}

export function LessonResourcesDialog({ lesson, courseId, open, onOpenChange }: Props) {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [addPending, startAdd] = useTransition();
  const [deletePending, startDelete] = useTransition();

  useEffect(() => {
    if (open) {
      setLoading(true);
      getLessonResources(lesson.id)
        .then(setResources)
        .finally(() => setLoading(false));
    }
  }, [open, lesson.id]);

  function handleAdd() {
    if (!fileUrl || !name.trim()) return;
    startAdd(async () => {
      const result = await addLessonResource(lesson.id, courseId, name, fileUrl);
      if (result?.success) {
        toast.success("Recurso agregado.");
        setFileUrl(null);
        setName("");
        getLessonResources(lesson.id).then(setResources);
      } else {
        toast.error(result?.message ?? "Error al agregar el recurso.");
      }
    });
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      const result = await removeLessonResource(id, courseId);
      if (result?.success) {
        toast.success("Recurso eliminado.");
        setResources((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast.error(result?.message ?? "Error al eliminar el recurso.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="size-4" />
            Recursos — {lesson.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-1">
          {/* Lista de recursos */}
          <div>
            <p className="text-xs font-medium text-[var(--color-neutral-500)] uppercase tracking-wide mb-2">
              Archivos adjuntos ({resources.length})
            </p>
            {loading ? (
              <p className="py-6 text-center text-xs text-[var(--color-neutral-400)]">Cargando...</p>
            ) : resources.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--color-neutral-400)] border border-dashed rounded-lg">
                Sin recursos adjuntos todavía.
              </p>
            ) : (
              <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
                {resources.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="shrink-0 text-[var(--color-neutral-400)]">
                      <ResourceIcon mimetype={r.mimetype} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-[var(--color-neutral-800)] hover:underline truncate block"
                      >
                        {r.name}
                      </a>
                      {r.file_size && (
                        <p className="text-xs text-[var(--color-neutral-400)]">{formatBytes(r.file_size)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletePending}
                      className="shrink-0 p-1.5 rounded-md text-[var(--color-neutral-400)] hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agregar recurso */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-[var(--color-neutral-500)] uppercase tracking-wide">
              Agregar recurso
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-neutral-700)]">
                Archivo <span className="text-red-500">*</span>
              </label>
              <MediaPicker
                bucket={LIBRARY_BUCKET}
                value={fileUrl}
                onChange={setFileUrl}
                accept="all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-neutral-700)]">
                Nombre para mostrar <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Guía de estudio PDF"
                disabled={addPending}
              />
            </div>

            <Button
              onClick={handleAdd}
              disabled={addPending || !fileUrl || !name.trim()}
              variant="outline"
              className="w-full"
            >
              {addPending ? "Agregando..." : "Agregar recurso"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

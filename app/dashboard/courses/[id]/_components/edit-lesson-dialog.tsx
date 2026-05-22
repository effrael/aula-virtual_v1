"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { PlayCircle, Link2, ClipboardList } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateLesson, type UpdateLessonState } from "@/app/actions/modules";
import type { LessonRow } from "@/lib/queries/modules";
import type { VideoRow } from "@/lib/queries/videos";
import { formatDuration } from "@/lib/utils";

type Props = {
  lesson: LessonRow | null;
  courseId: string;
  videos: VideoRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditLessonDialog({
  lesson,
  courseId,
  videos,
  open,
  onOpenChange,
}: Props) {
  const [type, setType] = useState<"video" | "link" | "quiz">(lesson?.type ?? "video");

  const [state, action, pending] = useActionState<UpdateLessonState, FormData>(
    updateLesson,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Lección actualizada.");
      onOpenChange(false);
    }
    if (state?.message) {
      toast.error(state.message);
    }
  }, [state, onOpenChange]);

  // Sincroniza el tipo cuando cambia la lección seleccionada
  useEffect(() => {
    if (open && lesson) setType(lesson.type);
  }, [open, lesson]);

  if (!lesson) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar lección</DialogTitle>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4 pt-2">
          <input type="hidden" name="id" value={lesson.id} />
          <input type="hidden" name="course_id" value={courseId} />
          <input type="hidden" name="type" value={type} />

          {/* Selector de tipo */}
          <div className="flex gap-2">
            {(
              [
                { value: "video", icon: PlayCircle, label: "Video" },
                { value: "link", icon: Link2, label: "Enlace externo" },
                { value: "quiz", icon: ClipboardList, label: "Quiz" },
              ] as const
            ).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  type === value
                    ? "border-[var(--color-primary)] bg-violet-50 text-[var(--color-primary)]"
                    : "border-[var(--color-neutral-200)] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-50)]"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-lesson-title"
              className="text-sm font-medium text-[var(--color-neutral-700)]"
            >
              Título <span className="text-red-500">*</span>
            </label>
            <Input
              id="edit-lesson-title"
              name="title"
              defaultValue={lesson.title}
              disabled={pending}
            />
            {state?.errors?.title && (
              <p className="text-xs text-red-500">{state.errors.title[0]}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-lesson-description"
              className="text-sm font-medium text-[var(--color-neutral-700)]"
            >
              Descripción
            </label>
            <textarea
              id="edit-lesson-description"
              name="description"
              rows={2}
              defaultValue={lesson.description ?? ""}
              disabled={pending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 resize-none"
            />
          </div>

          {/* Campo según tipo */}
          {type === "video" && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-lesson-video"
                className="text-sm font-medium text-[var(--color-neutral-700)]"
              >
                Video <span className="text-red-500">*</span>
              </label>
              <Select
                name="video_id"
                defaultValue={lesson.video_id ?? undefined}
                disabled={pending}
              >
                <SelectTrigger id="edit-lesson-video" className="w-full">
                  <SelectValue placeholder="Selecciona un video" />
                </SelectTrigger>
                <SelectContent>
                  {videos.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[var(--color-neutral-500)]">
                      No hay videos disponibles.
                    </p>
                  ) : (
                    videos.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        <span className="flex items-center gap-2">
                          <span className="truncate">{v.title}</span>
                          {v.duration && (
                            <span className="text-xs text-[var(--color-neutral-400)] shrink-0">
                              {formatDuration(v.duration)}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {state?.errors?.video_id && (
                <p className="text-xs text-red-500">
                  {state.errors.video_id[0]}
                </p>
              )}
            </div>
          )}
          {type === "link" && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-lesson-url"
                className="text-sm font-medium text-[var(--color-neutral-700)]"
              >
                URL <span className="text-red-500">*</span>
              </label>
              <Input
                id="edit-lesson-url"
                name="external_url"
                type="url"
                defaultValue={lesson.external_url ?? ""}
                disabled={pending}
              />
              {state?.errors?.external_url && (
                <p className="text-xs text-red-500">
                  {state.errors.external_url[0]}
                </p>
              )}
            </div>
          )}
          {type === "quiz" && (
            <p className="text-xs text-[var(--color-neutral-400)] bg-[var(--color-neutral-50)] rounded-lg px-3 py-2.5">
              Las preguntas y configuración del quiz se gestionan desde el menú de opciones de la lección.
            </p>
          )}

          <Button type="submit" disabled={pending} className="text-white w-full mt-1">
            {pending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

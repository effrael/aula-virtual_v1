"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
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
import { MediaPicker } from "@/components/media-picker";
import { LIBRARY_BUCKET, type StorageFile } from "@/lib/storage-utils";
import { updateCourse, type UpdateCourseState } from "@/app/actions/courses";
import type { CourseRow } from "@/lib/queries/courses";

type Teacher = { id: string; full_name: string };

type Props = {
  course: CourseRow;
  teachers: Teacher[];
  libraryFiles: StorageFile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditCourseDialog({
  course,
  teachers,
  libraryFiles,
  open,
  onOpenChange,
}: Props) {
  const [coverUrl, setCoverUrl] = useState<string | null>(course.cover_url);

  const [state, action, pending] = useActionState<UpdateCourseState, FormData>(
    updateCourse,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Curso actualizado correctamente.");
      onOpenChange(false);
    }
    if (state?.message) {
      toast.error(state.message);
    }
  }, [state, onOpenChange]);

  // Sincroniza la portada si se abre el dialog con un curso diferente
  useEffect(() => {
    if (open) setCoverUrl(course.cover_url);
  }, [open, course.cover_url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar curso</DialogTitle>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4 pt-2">
          <input type="hidden" name="id" value={course.id} />

          {/* Portada */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-neutral-700)]">
              Portada
            </label>
            <MediaPicker
              bucket={LIBRARY_BUCKET}
              value={coverUrl}
              onChange={setCoverUrl}
              initialFiles={libraryFiles}
              accept="image"
            />
            <input type="hidden" name="cover_url" value={coverUrl ?? ""} />
          </div>

          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-title"
              className="text-sm font-medium text-[var(--color-neutral-700)]"
            >
              Título <span className="text-red-500">*</span>
            </label>
            <Input
              id="edit-title"
              name="title"
              defaultValue={course.title}
              disabled={pending}
            />
            {state?.errors?.title && (
              <p className="text-xs text-red-500">{state.errors.title[0]}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-description"
              className="text-sm font-medium text-[var(--color-neutral-700)]"
            >
              Descripción
            </label>
            <textarea
              id="edit-description"
              name="description"
              rows={3}
              defaultValue={course.description ?? ""}
              disabled={pending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 resize-none"
            />
            {state?.errors?.description && (
              <p className="text-xs text-red-500">
                {state.errors.description[0]}
              </p>
            )}
          </div>

          {/* Docente */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-teacher"
              className="text-sm font-medium text-[var(--color-neutral-700)]"
            >
              Docente <span className="text-red-500">*</span>
            </label>
            <Select
              name="teacher_id"
              defaultValue={course.teacher_id ?? undefined}
              disabled={pending}
            >
              <SelectTrigger id="edit-teacher" className="w-full">
                <SelectValue placeholder="Selecciona un docente" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.teacher_id && (
              <p className="text-xs text-red-500">
                {state.errors.teacher_id[0]}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="text-white w-full mt-2"
          >
            {pending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

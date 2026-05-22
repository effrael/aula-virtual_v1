"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCourse, type CreateCourseState } from "@/app/actions/courses";
import { MediaPicker } from "@/components/media-picker";
import { LIBRARY_BUCKET, type StorageFile } from "@/lib/storage-utils";

type Teacher = { id: string; full_name: string };

type Props = {
  teachers: Teacher[];
  libraryFiles: StorageFile[];
};

export function CreateCourseDialog({ teachers, libraryFiles }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const [state, action, pending] = useActionState<CreateCourseState, FormData>(
    createCourse,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Curso creado correctamente.");
      setOpen(false);
      setCoverUrl(null);
      router.refresh();
    }
    if (state?.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="text-white shrink-0">
          <Plus className="size-4 mr-1.5" />
          Nuevo curso
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo curso</DialogTitle>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4 pt-2">
          {/* Portada — selección desde biblioteca */}
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
              htmlFor="title"
              className="text-sm font-medium text-[var(--color-neutral-700)]"
            >
              Título <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              name="title"
              placeholder="Ej. Matemáticas avanzadas"
              disabled={pending}
            />
            {state?.errors?.title && (
              <p className="text-xs text-red-500">{state.errors.title[0]}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="description"
              className="text-sm font-medium text-[var(--color-neutral-700)]"
            >
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Descripción breve del curso..."
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
              htmlFor="teacher_id"
              className="text-sm font-medium text-[var(--color-neutral-700)]"
            >
              Docente <span className="text-red-500">*</span>
            </label>
            <Select name="teacher_id" disabled={pending}>
              <SelectTrigger id="teacher_id" className="w-full">
                <SelectValue
                  placeholder="Selecciona un docente"
                  className="w-full"
                />
              </SelectTrigger>
              <SelectContent>
                {teachers.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[var(--color-neutral-500)]">
                    No hay docentes registrados.
                  </p>
                ) : (
                  teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name}
                    </SelectItem>
                  ))
                )}
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
            {pending ? "Creando..." : "Crear curso"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

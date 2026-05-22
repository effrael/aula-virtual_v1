"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Globe,
  Archive,
  Trash2,
  Pencil,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateCourseStatus, deleteCourse } from "@/app/actions/courses";
import { EditCourseDialog } from "@/components/edit-course-dialog";
import type { CourseRow } from "@/lib/queries/courses";
import type { StorageFile } from "@/lib/storage-utils";

type Teacher = { id: string; full_name: string };

type Props = {
  course: CourseRow;
  teachers: Teacher[];
  libraryFiles: StorageFile[];
};

export function CourseCardActions({ course, teachers, libraryFiles }: Props) {
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const { id, status } = course;

  function handleStatusChange(next: "borrador" | "publicado" | "archivado") {
    startTransition(async () => {
      const result = await updateCourseStatus(id, next);
      if (result?.success) {
        const labels = {
          publicado: "Curso publicado.",
          archivado: "Curso archivado.",
          borrador: "Curso restaurado a borrador.",
        };
        toast.success(labels[next]);
      } else {
        toast.error(result?.message ?? "Error al actualizar el estado.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCourse(id);
      if (result?.success) {
        toast.success("Curso eliminado.");
      } else {
        toast.error(result?.message ?? "Error al eliminar el curso.");
      }
    });
  }

  return (
    <>
    <EditCourseDialog
      course={course}
      teachers={teachers}
      libraryFiles={libraryFiles}
      open={editOpen}
      onOpenChange={setEditOpen}
    />
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="shrink-0 p-1 rounded-md hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-400)] disabled:opacity-50"
          disabled={pending}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Pencil className="size-3.5 mr-2" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Users className="size-3.5 mr-2" />
          Ver alumnos
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Transiciones de estado */}
        {status === "borrador" && (
          <DropdownMenuItem onClick={() => handleStatusChange("publicado")}>
            <Globe className="size-3.5 mr-2" />
            Publicar
          </DropdownMenuItem>
        )}
        {status !== "archivado" && (
          <DropdownMenuItem onClick={() => handleStatusChange("archivado")}>
            <Archive className="size-3.5 mr-2" />
            Archivar
          </DropdownMenuItem>
        )}
        {status === "archivado" && (
          <>
            <DropdownMenuItem onClick={() => handleStatusChange("publicado")}>
              <Globe className="size-3.5 mr-2" />
              Republicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("borrador")}>
              <Pencil className="size-3.5 mr-2" />
              Restaurar
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}

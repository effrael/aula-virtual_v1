import { BookOpen, Users, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CourseRow } from "@/lib/queries/courses";

const statusStyles: Record<string, string> = {
  publicado: "bg-green-100 text-green-700",
  borrador: "bg-amber-100 text-amber-700",
  archivado: "bg-neutral-100 text-neutral-500",
};

const statusLabels: Record<string, string> = {
  publicado: "Publicado",
  borrador: "Borrador",
  archivado: "Archivado",
};

type Props = {
  course: CourseRow;
  /** Mostrar el menú de acciones de admin (editar, archivar, eliminar) */
  showActions?: boolean;
};

export function CourseCard({ course, showActions = false }: Props) {
  return (
    <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white overflow-hidden flex flex-col">
      {/* Portada */}
      <div className="h-36 bg-[var(--color-neutral-100)] flex items-center justify-center">
        {course.cover_url ? (
          <img
            src={course.cover_url}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <BookOpen className="size-10 text-[var(--color-neutral-300)]" />
        )}
      </div>

      {/* Contenido */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--color-neutral-900)] truncate">
              {course.title}
            </p>
            <p className="text-xs text-[var(--color-neutral-400)] mt-0.5 line-clamp-2">
              {course.description}
            </p>
          </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="shrink-0 p-1 rounded-md hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-400)]">
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Editar</DropdownMenuItem>
                <DropdownMenuItem>Ver alumnos</DropdownMenuItem>
                <DropdownMenuItem>Archivar</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--color-neutral-100)]">
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-neutral-500)]">
            <Users className="size-3.5" />
            {course.enrolled} alumnos
          </div>
          <div className="flex items-center gap-2">
            {course.teacher && (
              <span className="text-xs text-[var(--color-neutral-400)]">
                {course.teacher}
              </span>
            )}
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[course.status]}`}
            >
              {statusLabels[course.status]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

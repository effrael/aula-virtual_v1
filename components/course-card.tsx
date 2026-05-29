import Link from "next/link";
import { BookOpen, Users } from "lucide-react";
import { CourseCardActions, type CoursePermissions } from "@/components/course-card-actions";
import type { CourseRow } from "@/lib/queries/courses";
import type { StorageFile } from "@/lib/storage-utils";

type Teacher = { id: string; full_name: string };

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
  permissions: CoursePermissions;
  teachers?: Teacher[];
  libraryFiles?: StorageFile[];
};

export function CourseCard({
  course,
  permissions,
  teachers = [],
  libraryFiles = [],
}: Props) {
  const hasAnyAction = permissions.canEdit || permissions.canPublish || permissions.canArchive || permissions.canDelete;
  return (
    <div className="relative rounded-xl border border-[var(--color-neutral-200)] bg-white overflow-hidden flex flex-col">
      {/* Stretched link — cubre toda la tarjeta excepto las acciones */}
      <Link
        href={`/dashboard/courses/${course.id}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Ver curso: ${course.title}`}
      />
      {/* Portada */}
      <div className="h-50 bg-[var(--color-neutral-100)] flex items-center justify-center">
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

          {hasAnyAction && (
            <div className="relative z-10">
              <CourseCardActions
                course={course}
                teachers={teachers}
                libraryFiles={libraryFiles}
                permissions={permissions}
              />
            </div>
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

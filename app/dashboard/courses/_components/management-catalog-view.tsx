import { BookOpen, BookOpenCheck, FilePen, Archive } from "lucide-react";
import { CourseCard } from "@/components/course-card";
import { CreateCourseDialog } from "./create-course-dialog";
import type { CourseRow } from "@/lib/queries/courses";
import type { CoursePermissions } from "@/components/course-card-actions";
import type { StorageFile } from "@/lib/storage-utils";

interface Teacher {
  id: string;
  full_name: string;
}

export type ManagementPermissions = CoursePermissions & { canCreate: boolean };

interface Props {
  courses: CourseRow[];
  teachers: Teacher[];
  libraryFiles: StorageFile[];
  permissions: ManagementPermissions;
  subtitle: string;
  role: string;
}

export function ManagementCatalogView({
  courses,
  teachers,
  libraryFiles,
  permissions,
  subtitle,
  role,
}: Props) {
  const kpis = [
    { label: "Total cursos", value: courses.length,                                                  icon: BookOpen,      color: "bg-violet-50 text-violet-600"   },
    { label: "Publicados",   value: courses.filter((c) => c.status === "publicado").length,          icon: BookOpenCheck, color: "bg-green-50 text-green-600"    },
    { label: "En borrador",  value: courses.filter((c) => c.status === "borrador").length,           icon: FilePen,       color: "bg-amber-50 text-amber-600"    },
    ...(role !== "docente"
      ? [{ label: "Archivados", value: courses.filter((c) => c.status === "archivado").length, icon: Archive, color: "bg-neutral-100 text-neutral-500" }]
      : []),
  ];

  if (courses.length === 0) {
    return (
      <main className="flex flex-col gap-6 p-6 bg-sidebar">
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <BookOpen className="size-7 text-[var(--color-neutral-400)]" />
          <div>
            <p className="text-base font-semibold">No hay cursos todavía</p>
            <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
              {permissions.canCreate
                ? "Crea el primer curso para empezar."
                : "Aún no hay cursos disponibles."}
            </p>
          </div>
          {permissions.canCreate && (
            <CreateCourseDialog teachers={teachers} libraryFiles={libraryFiles} />
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-6 bg-sidebar">
      {/* Título + acción */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">
            Catálogo de cursos
          </h2>
          <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">{subtitle}</p>
        </div>
        {permissions.canCreate && (
          <CreateCourseDialog teachers={teachers} libraryFiles={libraryFiles} />
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 border bg-white rounded-lg divide-x">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="p-5 flex items-center gap-4">
            <span className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${kpi.color}`}>
              <kpi.icon className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold text-[var(--color-neutral-900)]">{kpi.value}</p>
              <p className="text-xs text-[var(--color-neutral-500)]">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Grid de cursos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            permissions={permissions}
            teachers={teachers}
            libraryFiles={libraryFiles}
          />
        ))}
      </div>
    </main>
  );
}

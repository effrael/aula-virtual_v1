import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { BookOpen, BookOpenCheck, FilePen, Archive } from "lucide-react";
import { getCourses } from "@/lib/queries/courses";
import { getUsersByRole } from "@/lib/queries/users";
import { getStorageFiles } from "@/lib/queries/storage";
import { LIBRARY_BUCKET } from "@/lib/storage-utils";
import { CourseCard } from "@/components/course-card";
import { CreateCourseDialog } from "./_components/create-course-dialog";

// ── Page ────────────────────────────────────────────────────────────────────

export default async function CoursesPage() {
  const [courses, teachers, libraryFiles] = await Promise.all([
    getCourses(),
    getUsersByRole("docente"),
    getStorageFiles(LIBRARY_BUCKET),
  ]);
  const isEmpty = courses.length === 0;

  const kpis = [
    {
      label: "Total cursos",
      value: courses.length,
      icon: BookOpen,
      color: "bg-violet-50 text-violet-600",
    },
    {
      label: "Publicados",
      value: courses.filter((c) => c.status === "publicado").length,
      icon: BookOpenCheck,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "En borrador",
      value: courses.filter((c) => c.status === "borrador").length,
      icon: FilePen,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Archivados",
      value: courses.filter((c) => c.status === "archivado").length,
      icon: Archive,
      color: "bg-neutral-100 text-neutral-500",
    },
  ];

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--color-neutral-200)] px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Cursos
        </h1>
      </header>

      <main className="flex flex-col gap-6 p-6 bg-sidebar">
        {/* Título + acción */}

        {isEmpty ? (
          /* Estado vacío */
          <>
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <span className="flex items-center justify-center size-14 rounded-full">
                <BookOpen className="size-7 text-[var(--color-neutral-400)]" />
              </span>
              <div>
                <p className="text-base font-semibold">No hay cursos todavía</p>
                <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
                  Crea el primer curso para empezar.
                </p>
              </div>
              <CreateCourseDialog teachers={teachers} libraryFiles={libraryFiles} />
            </div>
          </>
        ) : (
          <>
            {/* KPIs */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">
                  Catálogo de cursos
                </h2>
                <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
                  Gestiona todos los cursos de la plataforma.
                </p>
              </div>
              <CreateCourseDialog teachers={teachers} libraryFiles={libraryFiles} />
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 border bg-white rounded-lg divide-x">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="p-5 flex items-center gap-4">
                  <span
                    className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${kpi.color}`}
                  >
                    <kpi.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-2xl font-bold text-[var(--color-neutral-900)]">
                      {kpi.value}
                    </p>
                    <p className="text-xs text-[var(--color-neutral-500)]">
                      {kpi.label}
                    </p>
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
                  showActions
                  teachers={teachers}
                  libraryFiles={libraryFiles}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}

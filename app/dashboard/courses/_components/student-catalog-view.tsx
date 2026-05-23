import { BookOpen, BookOpenCheck, FilePen } from "lucide-react";
import { CourseCard } from "@/components/course-card";
import type { CourseRow } from "@/lib/queries/courses";

const STUDENT_PERMS = {
  canEdit: false,
  canPublish: false,
  canArchive: false,
  canDelete: false,
};

interface Props {
  courses: CourseRow[];
  stats: { total: number; completed: number; inProgress: number };
}

export function StudentCatalogView({ courses, stats }: Props) {
  const kpis = [
    { label: "Mis cursos",   value: stats.total,      icon: BookOpen,      color: "bg-violet-50 text-violet-600" },
    { label: "En curso",     value: stats.inProgress, icon: FilePen,       color: "bg-amber-50 text-amber-600"  },
    { label: "Completados",  value: stats.completed,  icon: BookOpenCheck, color: "bg-green-50 text-green-600"  },
  ];

  if (courses.length === 0) {
    return (
      <main className="flex flex-col gap-6 p-6 bg-sidebar">
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <BookOpen className="size-7 text-[var(--color-neutral-400)]" />
          <div>
            <p className="text-base font-semibold">Sin cursos disponibles</p>
            <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
              Aún no estás inscrito en ningún curso.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-6 bg-sidebar">
      {/* Título */}
      <div>
        <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">
          Catálogo de cursos
        </h2>
        <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
          Empieza con tus cursos
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 border bg-white rounded-lg divide-x">
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
            permissions={STUDENT_PERMS}
            teachers={[]}
            libraryFiles={[]}
          />
        ))}
      </div>
    </main>
  );
}

import { PageHeader } from "@/components/page-header";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getCourseWithModules } from "@/lib/queries/modules";
import { getVideos } from "@/lib/queries/videos";
import { getStorageFiles } from "@/lib/queries/storage";
import { LIBRARY_BUCKET } from "@/lib/storage-utils";
import { getEnrollments, getStudents } from "@/lib/queries/enrollments";
import { ModuleList } from "./_components/module-list";
import { EnrollmentsSection } from "./_components/enrollments-section";
import { CertificateSection } from "./_components/certificate-section";
import { StudentCourseView } from "../_components/student-course-view";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCertificateTemplates } from "@/app/actions/certificate-templates";

const statusStyles = {
  publicado: "bg-green-100 text-green-700",
  borrador: "bg-amber-100 text-amber-700",
  archivado: "bg-neutral-100 text-neutral-500",
} as const;

const statusLabels = {
  publicado: "Publicado",
  borrador: "Borrador",
  archivado: "Archivado",
} as const;

// ── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 1;

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, full_name")
    .eq("id", user!.id)
    .single();
  const role = profile?.role ?? "alumno";
  const canEdit = role !== "alumno";

  const [course, videos, libraryFiles, enrollmentsResult, students, certTemplates] =
    await Promise.all([
      getCourseWithModules(id),
      canEdit ? getVideos() : Promise.resolve([]),
      canEdit ? getStorageFiles(LIBRARY_BUCKET) : Promise.resolve([]),
      canEdit ? getEnrollments(id, page, PAGE_SIZE) : Promise.resolve({ data: [], total: 0 }),
      canEdit ? getStudents() : Promise.resolve([]),
      canEdit ? getCertificateTemplates() : Promise.resolve([]),
    ]);

  const enrollments = enrollmentsResult.data;
  const enrollmentsTotal = enrollmentsResult.total;

  const AUTO_FIELDS_SET = new Set(["nombre", "apellidos", "dni", "codigo", "qr"]);
  const certTemplatesForSection = certTemplates.map((t) => {
    const tpl = t.pdfme_template as any;
    const customFields: { name: string; defaultValue: string }[] = [];
    if (tpl?.schemas) {
      for (const page of tpl.schemas) {
        if (Array.isArray(page)) {
          for (const field of page) {
            if (field?.name && !AUTO_FIELDS_SET.has(field.name)) {
              customFields.push({ name: field.name, defaultValue: field.content ?? "" });
            }
          }
        }
      }
    }
    return { id: t.id, name: t.name, customFields };
  });

  if (!course) notFound();

  // ── Vista del alumno ────────────────────────────────────────────────────────
  if (role === "alumno") {
    // Obtener lecciones ya completadas por el alumno
    const allLessonIds = course.modules
      .filter((m) => m.is_active)
      .flatMap((m) => m.lessons.map((l) => l.id));

    let completedLessonIds: string[] = [];
    if (allLessonIds.length > 0) {
      const { data: progressRows } = await supabaseAdmin
        .from("lesson_progress")
        .select("lesson_id")
        .eq("student_id", user!.id)
        .eq("completed", true)
        .in("lesson_id", allLessonIds);
      completedLessonIds = (progressRows ?? []).map((r) => r.lesson_id);
    }

    return (
      <>
        <PageHeader>
          <a
            href="/dashboard/courses"
            className="text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] transition-colors"
          >
            Mis cursos
          </a>
          <span className="text-[var(--color-neutral-300)]">/</span>
          <span className="font-semibold text-[var(--color-neutral-900)] truncate max-w-xs">
            {course.title}
          </span>
        </PageHeader>
        <StudentCourseView
          course={course}
          initialCompleted={completedLessonIds}
          userId={user!.id}
          userFullName={profile?.full_name ?? "Tú"}
        />
      </>
    );
  }

  // Solo videos listos disponibles para asignar a lecciones
  const readyVideos = videos.filter((v) => v.status === "listo");

  return (
    <>
      <PageHeader>
        <a
          href="/dashboard/courses"
          className="text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] transition-colors"
        >
          Cursos
        </a>
        <span className="text-[var(--color-neutral-300)]">/</span>
        <span className="font-semibold text-[var(--color-neutral-900)] truncate max-w-xs">
          {course.title}
        </span>
      </PageHeader>

      <main className="flex flex-col gap-6 p-6 bg-sidebar">
        {/* Cabecera del curso */}
        <div className="flex items-start gap-4 p-5 bg-white rounded-xl border border-[var(--color-neutral-200)]">
          {/* Portada miniatura */}
          <div className="shrink-0 w-20 h-20 rounded-lg bg-[var(--color-neutral-100)] flex items-center justify-center overflow-hidden">
            {course.cover_url ? (
              <img
                src={course.cover_url}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <BookOpen className="size-8 text-[var(--color-neutral-300)]" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-[var(--color-neutral-900)]">
                {course.title}
              </h1>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[course.status]}`}
              >
                {statusLabels[course.status]}
              </span>
            </div>
            {course.description && (
              <p className="text-sm text-[var(--color-neutral-500)] mt-1 line-clamp-2">
                {course.description}
              </p>
            )}
            {course.teacher && (
              <p className="text-sm text-[var(--color-neutral-500)] mt-1 line-clamp-2">
                Docente: {course.teacher}
              </p>
            )}
          </div>

          {/* Contadores */}
          <div className="shrink-0 hidden sm:flex gap-4 text-right">
            <div>
              <p className="text-2xl font-bold text-center">
                {course.modules.length}{" "}
              </p>
              <p className="text-xs text-[var(--color-neutral-400)]">
                {course.modules.length === 1 ? "módulo" : "módulos"}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-center">
                {course.modules.reduce((acc, m) => acc + m.lessons.length, 0)}
              </p>
              <p className="text-xs text-[var(--color-neutral-400)]">
                lecciones
              </p>
            </div>
          </div>
        </div>

        {/* Sección de contenido */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-neutral-900)]">
                Contenido del curso
              </h2>
              <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
                Organiza los módulos y lecciones que verán los alumnos.
              </p>
            </div>
          </div>

          <ModuleList
            courseId={course.id}
            modules={course.modules}
            videos={readyVideos}
            libraryFiles={libraryFiles}
            canEdit={canEdit}
          />
        </div>

        {/* Sección de certificado */}
        {canEdit && (
          <CertificateSection
            courseId={course.id}
            templates={certTemplatesForSection}
            initialTemplateId={course.certificate_template_id}
            initialCustomInputs={course.certificate_custom_inputs}
          />
        )}

        {/* Sección de inscripciones */}
        {canEdit && (
          <EnrollmentsSection
            courseId={course.id}
            enrollments={enrollments}
            students={students}
            total={enrollmentsTotal}
            page={page}
            pageSize={PAGE_SIZE}
          />
        )}
      </main>
    </>
  );
}

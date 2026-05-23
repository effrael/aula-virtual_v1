import { PageHeader } from "@/components/page-header";
import { getCourses, getCoursesByTeacher, getCoursesByStudent, getEnrollmentStats } from "@/lib/queries/courses";
import { getUsersByRole } from "@/lib/queries/users";
import { getStorageFiles } from "@/lib/queries/storage";
import { LIBRARY_BUCKET } from "@/lib/storage-utils";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { StudentCatalogView } from "./_components/student-catalog-view";
import { ManagementCatalogView } from "./_components/management-catalog-view";
import type { ManagementPermissions } from "./_components/management-catalog-view";

// ── Permisos por rol ──────────────────────────────────────────────────────────

function getPermissionsByRole(role: string): ManagementPermissions {
  switch (role) {
    case "superadmin":
    case "admin":
      return { canCreate: true, canEdit: true, canPublish: true, canArchive: true, canDelete: true };
    case "colaborador":
      return { canCreate: false, canEdit: true, canPublish: true, canArchive: true, canDelete: false };
    case "docente":
      return { canCreate: false, canEdit: true, canPublish: true, canArchive: false, canDelete: false };
    default:
      return { canCreate: false, canEdit: false, canPublish: false, canArchive: false, canDelete: false };
  }
}

const subtitles: Record<string, string> = {
  docente:      "Cursos asignados a ti.",
  colaborador:  "Gestiona todos los cursos de la plataforma.",
  admin:        "Gestiona todos los cursos de la plataforma.",
  superadmin:   "Gestiona todos los cursos de la plataforma.",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const role = profile?.role ?? "alumno";
  const isStudent = role === "alumno";
  const permissions = getPermissionsByRole(role);

  function getCoursesQuery() {
    if (isStudent) return getCoursesByStudent(user!.id);
    if (role === "docente") return getCoursesByTeacher(user!.id);
    return getCourses();
  }

  const [courses, teachers, libraryFiles, enrollmentStats] = await Promise.all([
    getCoursesQuery(),
    permissions.canEdit ? getUsersByRole("docente") : Promise.resolve([]),
    permissions.canEdit ? getStorageFiles(LIBRARY_BUCKET) : Promise.resolve([]),
    isStudent ? getEnrollmentStats(user!.id) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader>
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">Cursos</h1>
      </PageHeader>

      {isStudent ? (
        <StudentCatalogView
          courses={courses}
          stats={enrollmentStats ?? { total: 0, completed: 0, inProgress: 0 }}
        />
      ) : (
        <ManagementCatalogView
          courses={courses}
          teachers={teachers}
          libraryFiles={libraryFiles}
          permissions={permissions}
          subtitle={subtitles[role] ?? "Gestiona todos los cursos de la plataforma."}
          role={role}
        />
      )}
    </>
  );
}

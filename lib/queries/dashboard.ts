import { supabaseAdmin } from "@/lib/supabase/admin";

export type DashboardStats = {
  totalAlumnos: number;
  totalDocentes: number;
  cursosPublicados: number;
  cursosBorrador: number;
  certificadosEmitidos: number;
  recentUsers: { id: string; full_name: string; role: string; created_at: string }[];
  popularCourses: { title: string; teacher: string; enrolled: number }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    { count: totalAlumnos },
    { count: totalDocentes },
    { count: cursosPublicados },
    { count: cursosBorrador },
    { count: certificadosEmitidos },
    { data: recentUsersData },
    { data: coursesData },
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "alumno")
      .is("deleted_at", null),
    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "docente")
      .is("deleted_at", null),
    supabaseAdmin
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("status", "publicado")
      .is("deleted_at", null),
    supabaseAdmin
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("status", "borrador")
      .is("deleted_at", null),
    supabaseAdmin
      .from("certificates")
      .select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("courses")
      .select("title, teacher:profiles!teacher_id(full_name), enrollments(count)")
      .is("deleted_at", null)
      .eq("status", "publicado")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const recentUsers = (recentUsersData ?? []).map((u: any) => ({
    id: u.id,
    full_name: u.full_name ?? "",
    role: u.role,
    created_at: u.created_at,
  }));

  const popularCourses = (coursesData ?? [])
    .map((c: any) => ({
      title: c.title,
      teacher: (c.teacher as any)?.full_name ?? "",
      enrolled: (c.enrollments as any[])?.[0]?.count ?? 0,
    }))
    .sort((a: any, b: any) => b.enrolled - a.enrolled)
    .slice(0, 5);

  return {
    totalAlumnos: totalAlumnos ?? 0,
    totalDocentes: totalDocentes ?? 0,
    cursosPublicados: cursosPublicados ?? 0,
    cursosBorrador: cursosBorrador ?? 0,
    certificadosEmitidos: certificadosEmitidos ?? 0,
    recentUsers,
    popularCourses,
  };
}

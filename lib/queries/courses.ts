import { supabaseAdmin } from "@/lib/supabase/admin";

export type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: "borrador" | "publicado" | "archivado";
  teacher_id: string | null;
  teacher: string | null;
  enrolled: number;
};

function mapCourse(c: any): CourseRow {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    cover_url: c.cover_url,
    status: c.status as "borrador" | "publicado" | "archivado",
    teacher_id: c.teacher_id ?? null,
    teacher: (c.teacher as { full_name: string } | null)?.full_name ?? null,
    enrolled: (c.enrollments as { count: number }[])?.[0]?.count ?? 0,
  };
}

const COURSE_SELECT = `
  id,
  title,
  description,
  cover_url,
  status,
  teacher_id,
  teacher:profiles!teacher_id(full_name),
  enrollments(count)
`;

export async function getCourses(): Promise<CourseRow[]> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select(COURSE_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[getCourses]", error?.message);
    return [];
  }

  return data.map(mapCourse);
}

export async function getCoursesByTeacher(teacherId: string): Promise<CourseRow[]> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select(COURSE_SELECT)
    .eq("teacher_id", teacherId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[getCoursesByTeacher]", error?.message);
    return [];
  }

  return data.map(mapCourse);
}

export async function getCoursesByStudent(studentId: string): Promise<CourseRow[]> {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select(`course:courses!course_id(${COURSE_SELECT})`)
    .eq("student_id", studentId);

  if (error || !data) {
    console.error("[getCoursesByStudent]", error?.message);
    return [];
  }

  return data
    .map((e) => e.course)
    .filter((c): c is NonNullable<typeof c> => c !== null && c.status === "publicado")
    .map(mapCourse);
}

export async function getEnrollmentStats(studentId: string): Promise<{ total: number; completed: number; inProgress: number }> {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select("completed_at, course:courses!course_id(status)")
    .eq("student_id", studentId);

  if (error || !data) {
    console.error("[getEnrollmentStats]", error?.message);
    return { total: 0, completed: 0, inProgress: 0 };
  }

  const published = data.filter((e) => (e.course as any)?.status === "publicado");
  const completed = published.filter((e) => e.completed_at !== null).length;
  return { total: published.length, completed, inProgress: published.length - completed };
}

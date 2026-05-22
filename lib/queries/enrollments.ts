import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type EnrollmentRow = {
  id: string;
  student_id: string;
  full_name: string;
  enrolled_at: string;
};

export type StudentRow = {
  id: string;
  full_name: string;
};

export async function getEnrollments(courseId: string): Promise<EnrollmentRow[]> {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select(
      `
      id,
      student_id,
      enrolled_at,
      student:profiles!student_id(full_name)
    `
    )
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: false });

  if (error || !data) {
    console.error("[getEnrollments]", error?.message);
    return [];
  }

  return data.map((e) => ({
    id: e.id,
    student_id: e.student_id,
    full_name: (e.student as { full_name: string } | null)?.full_name ?? "",
    enrolled_at: e.enrolled_at,
  }));
}

export async function getStudents(): Promise<StudentRow[]> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "alumno")
    .eq("status", "activo")
    .is("deleted_at", null)
    .order("full_name");

  if (error || !data) {
    console.error("[getStudents]", error?.message);
    return [];
  }

  return data as StudentRow[];
}

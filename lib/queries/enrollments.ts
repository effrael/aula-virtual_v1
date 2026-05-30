import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type EnrollmentRow = {
  id: string;
  student_id: string;
  full_name: string;
  apellidos: string;
  dni: string;
  email: string;
  enrolled_at: string;
};

export type StudentRow = {
  id: string;
  full_name: string;
  apellidos: string | null;
};

export async function getEnrollments(
  courseId: string,
  page = 1,
  pageSize = 1
): Promise<{ data: EnrollmentRow[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabaseAdmin
    .from("enrollments")
    .select(
      `
      id,
      student_id,
      enrolled_at,
      student:profiles!student_id(full_name, apellidos, dni)
    `,
      { count: "exact" }
    )
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: false })
    .range(from, to);

  if (error || !data) {
    console.error("[getEnrollments]", error?.message);
    return { data: [], total: 0 };
  }

  const emailResults = await Promise.all(
    data.map((e) => supabaseAdmin.auth.admin.getUserById(e.student_id))
  );
  const emailMap = new Map(
    emailResults.map((r, i) => [data[i].student_id, r.data.user?.email ?? ""])
  );

  return {
    data: data.map((e) => {
      const p = e.student as {
        full_name: string;
        apellidos: string | null;
        dni: string;
      } | null;
      return {
        id: e.id,
        student_id: e.student_id,
        full_name: p?.full_name ?? "",
        apellidos: p?.apellidos ?? "",
        dni: p?.dni ?? "",
        email: emailMap.get(e.student_id) ?? "",
        enrolled_at: e.enrolled_at,
      };
    }),
    total: count ?? 0,
  };
}

export async function getStudents(): Promise<StudentRow[]> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, apellidos")
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

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

export async function getCourses(): Promise<CourseRow[]> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select(
      `
      id,
      title,
      description,
      cover_url,
      status,
      teacher_id,
      teacher:profiles!teacher_id(full_name),
      enrollments(count)
    `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[getCourses]", error?.message);
    return [];
  }

  return data.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    cover_url: c.cover_url,
    status: c.status as "borrador" | "publicado" | "archivado",
    teacher_id: c.teacher_id ?? null,
    teacher: (c.teacher as { full_name: string } | null)?.full_name ?? null,
    enrolled: (c.enrollments as { count: number }[])?.[0]?.count ?? 0,
  }));
}

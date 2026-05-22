import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  type: "video" | "link" | "quiz";
  video_id: string | null;
  external_url: string | null;
};

export type ModuleRow = {
  id: string;
  title: string;
  position: number;
  is_active: boolean;
  lessons: LessonRow[];
};

export type CourseWithModules = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: "borrador" | "publicado" | "archivado";
  teacher: string | null;
  modules: ModuleRow[];
};

// ── getCourseWithModules ──────────────────────────────────────────────────────

export async function getCourseWithModules(
  courseId: string
): Promise<CourseWithModules | null> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select(
      `
      id, title, description, cover_url, status,
      teacher:profiles!teacher_id(full_name),
      modules(
        id, title, position, is_active,
        lessons(
          id, title, description, position, type,
          video_id, external_url, deleted_at
        )
      )
    `
    )
    .eq("id", courseId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    console.error("[getCourseWithModules]", error?.message);
    return null;
  }

  const modules: ModuleRow[] = ((data.modules as any[]) ?? [])
    .map((m) => ({
      id: m.id,
      title: m.title,
      position: m.position,
      is_active: m.is_active,
      lessons: ((m.lessons as any[]) ?? [])
        .filter((l) => l.deleted_at === null)
        .map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          position: l.position,
          type: l.type as "video" | "link" | "quiz",
          video_id: l.video_id,
          external_url: l.external_url,
        }))
        .sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position);

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    cover_url: data.cover_url,
    status: data.status as "borrador" | "publicado" | "archivado",
    teacher: (data.teacher as { full_name: string } | null)?.full_name ?? null,
    modules,
  };
}

"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type SubmissionRow = {
  id: string;
  student_id: string;
  student_name: string;
  file_url: string;
  file_name: string;
  mimetype: string;
  created_at: string;
};

// ── getLessonSubmissions ──────────────────────────────────────────────────────
// Server function — admin ve todas las entregas de una lección link

export async function getLessonSubmissions(lessonId: string): Promise<SubmissionRow[]> {
  const { data, error } = await supabaseAdmin
    .from("lesson_submissions")
    .select(
      `
      id,
      student_id,
      file_url,
      file_name,
      mimetype,
      created_at,
      student:profiles!student_id(full_name)
    `
    )
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[getLessonSubmissions]", error?.message);
    return [];
  }

  return data.map((s) => ({
    id: s.id,
    student_id: s.student_id,
    student_name: (s.student as { full_name: string } | null)?.full_name ?? "—",
    file_url: s.file_url,
    file_name: s.file_name,
    mimetype: s.mimetype,
    created_at: s.created_at,
  }));
}

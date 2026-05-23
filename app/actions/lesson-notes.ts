"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ── getLessonNote ─────────────────────────────────────────────────────────────

export async function getLessonNote(lessonId: string): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "";

  const { data } = await supabaseAdmin
    .from("lesson_notes")
    .select("body")
    .eq("lesson_id", lessonId)
    .eq("student_id", user.id)
    .single();

  return data?.body ?? "";
}

// ── saveLessonNote ────────────────────────────────────────────────────────────

export async function saveLessonNote(
  lessonId: string,
  body: string,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabaseAdmin
    .from("lesson_notes")
    .upsert(
      { lesson_id: lessonId, student_id: user.id, body, updated_at: new Date().toISOString() },
      { onConflict: "lesson_id,student_id" },
    );

  if (error) {
    console.error("[saveLessonNote]", error.message);
    return { success: false };
  }

  return { success: true };
}

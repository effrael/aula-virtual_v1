"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ── markLessonComplete ────────────────────────────────────────────────────────
// Persiste una lección como completada para el alumno autenticado.

export async function markLessonComplete(lessonId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabaseAdmin.from("lesson_progress").upsert(
    {
      lesson_id: lessonId,
      student_id: user.id,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "lesson_id,student_id" }
  );
}

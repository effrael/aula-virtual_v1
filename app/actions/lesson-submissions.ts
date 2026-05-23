"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SUBMISSIONS_BUCKET = "library";

// ── submitLessonFile ──────────────────────────────────────────────────────────
// El alumno sube su archivo como evidencia de una lección tipo "link"

export async function submitLessonFile(
  lessonId: string,
  formData: FormData
): Promise<{ success?: boolean; message?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "No autenticado." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { message: "Selecciona un archivo." };

  const MAX_MB = 20;
  if (file.size > MAX_MB * 1024 * 1024)
    return { message: `El archivo no puede superar ${MAX_MB} MB.` };

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${lessonId}/${user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(SUBMISSIONS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("[submitLessonFile] upload:", uploadError.message);
    return { message: "Error al subir el archivo. Intenta nuevamente." };
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(SUBMISSIONS_BUCKET)
    .getPublicUrl(path);

  const { error: dbError } = await supabaseAdmin
    .from("lesson_submissions")
    .upsert(
      {
        lesson_id: lessonId,
        student_id: user.id,
        file_url: publicUrl,
        file_name: file.name,
        mimetype: file.type,
      },
      { onConflict: "lesson_id,student_id" }
    );

  if (dbError) {
    console.error("[submitLessonFile] db:", dbError.message);
    return { message: "Archivo subido pero no se pudo registrar. Intenta nuevamente." };
  }

  // Marcar lección como completada en lesson_progress
  await supabaseAdmin.from("lesson_progress").upsert(
    { lesson_id: lessonId, student_id: user.id, completed: true, completed_at: new Date().toISOString() },
    { onConflict: "lesson_id,student_id" }
  );

  return { success: true };
}

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

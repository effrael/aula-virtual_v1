"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ── Types ─────────────────────────────────────────────────────────────────────

export type QuizOption = {
  id?: string;
  body: string;
  is_correct: boolean;
  position?: number;
};

export type QuizQuestion = {
  id: string;
  body: string;
  type: "single" | "multiple" | "opinion";
  position: number;
  points: number;
  options: QuizOption[];
};

export type QuizData = {
  id: string;
  time_limit_mins: number | null;
  randomize: boolean;
  passing_score: number;
  is_certification: boolean;
  max_attempts: number | null;
  questions: QuizQuestion[];
};

export type AttemptRow = {
  id: string;
  score: number | null;
  passed: boolean | null;
  started_at: string;
  finished_at: string | null;
  student_name: string;
};

export type QuizActionResult = { success?: boolean; message?: string; id?: string };

// ── getQuizByLessonId ─────────────────────────────────────────────────────────
// Obtiene el quiz ligado a una lección. Si no existe, lo crea con valores por defecto.

export async function getQuizByLessonId(lessonId: string): Promise<QuizData | null> {
  const supabase = supabaseAdmin;

  // Intentar obtener el quiz existente
  let { data, error } = await supabase
    .from("quizzes")
    .select(
      `
      id, time_limit_mins, randomize, passing_score, is_certification, max_attempts,
      quiz_questions(
        id, body, type, position, points,
        quiz_options(id, body, is_correct, position)
      )
    `
    )
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) {
    console.error("[getQuizByLessonId]", error.message);
    return null;
  }

  // Si no existe, auto-crear con defaults
  if (!data) {
    const { data: created, error: createError } = await supabase
      .from("quizzes")
      .insert({ lesson_id: lessonId })
      .select("id, time_limit_mins, randomize, passing_score, is_certification, max_attempts")
      .single();

    if (createError || !created) {
      console.error("[getQuizByLessonId] auto-create", createError?.message);
      return null;
    }

    return {
      id: created.id,
      time_limit_mins: created.time_limit_mins,
      randomize: created.randomize,
      passing_score: created.passing_score,
      is_certification: created.is_certification,
      max_attempts: created.max_attempts,
      questions: [],
    };
  }

  const questions: QuizQuestion[] = ((data.quiz_questions as any[]) ?? [])
    .sort((a, b) => a.position - b.position)
    .map((q) => ({
      id: q.id,
      body: q.body,
      type: q.type as "single" | "multiple" | "opinion",
      position: q.position,
      points: q.points,
      options: ((q.quiz_options as any[]) ?? [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((o: any) => ({
          id: o.id,
          body: o.body,
          is_correct: o.is_correct,
          position: o.position,
        })),
    }));

  return {
    id: data.id,
    time_limit_mins: data.time_limit_mins,
    randomize: data.randomize,
    passing_score: data.passing_score,
    is_certification: data.is_certification,
    max_attempts: data.max_attempts,
    questions,
  };
}

// ── saveQuizSettings ──────────────────────────────────────────────────────────

export async function saveQuizSettings(
  quizId: string,
  courseId: string,
  settings: {
    time_limit_mins: number | null;
    randomize: boolean;
    passing_score: number;
    is_certification: boolean;
    max_attempts: number | null;
  }
): Promise<QuizActionResult> {
  const { error } = await supabaseAdmin
    .from("quizzes")
    .update(settings)
    .eq("id", quizId);

  if (error) {
    console.error("[saveQuizSettings]", error.message);
    return { message: "No se pudo guardar la configuración." };
  }

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { success: true };
}

// ── createQuestion ────────────────────────────────────────────────────────────

export async function createQuestion(
  quizId: string,
  courseId: string,
  data: { body: string; type: "single" | "multiple" | "opinion"; points: number }
): Promise<QuizActionResult> {
  const supabase = supabaseAdmin;

  const { data: last } = await supabase
    .from("quiz_questions")
    .select("position")
    .eq("quiz_id", quizId)
    .order("position", { ascending: false })
    .limit(1);

  const position = last?.[0]?.position != null ? last[0].position + 1 : 0;

  const { data: created, error } = await supabase
    .from("quiz_questions")
    .insert({ quiz_id: quizId, ...data, position })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[createQuestion]", error?.message);
    return { message: "No se pudo crear la pregunta." };
  }

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { success: true, id: created.id };
}

// ── updateQuestion ────────────────────────────────────────────────────────────

export async function updateQuestion(
  questionId: string,
  courseId: string,
  data: { body: string; type: "single" | "multiple" | "opinion"; points: number }
): Promise<QuizActionResult> {
  const { error } = await supabaseAdmin
    .from("quiz_questions")
    .update(data)
    .eq("id", questionId);

  if (error) {
    console.error("[updateQuestion]", error.message);
    return { message: "No se pudo actualizar la pregunta." };
  }

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { success: true };
}

// ── deleteQuestion ────────────────────────────────────────────────────────────

export async function deleteQuestion(
  questionId: string,
  courseId: string
): Promise<QuizActionResult> {
  const { error } = await supabaseAdmin
    .from("quiz_questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    console.error("[deleteQuestion]", error.message);
    return { message: "No se pudo eliminar la pregunta." };
  }

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { success: true };
}

// ── replaceQuestionOptions ────────────────────────────────────────────────────
// Reemplaza todas las opciones de una pregunta en un solo paso (delete + insert).

export async function replaceQuestionOptions(
  questionId: string,
  options: Array<{ body: string; is_correct: boolean }>
): Promise<QuizActionResult> {
  const supabase = supabaseAdmin;

  const { error: deleteError } = await supabase
    .from("quiz_options")
    .delete()
    .eq("question_id", questionId);

  if (deleteError) {
    console.error("[replaceQuestionOptions] delete", deleteError.message);
    return { message: "No se pudieron actualizar las opciones." };
  }

  if (options.length === 0) return { success: true };

  const { error: insertError } = await supabase.from("quiz_options").insert(
    options.map((o, i) => ({
      question_id: questionId,
      body: o.body,
      is_correct: o.is_correct,
      position: i,
    }))
  );

  if (insertError) {
    console.error("[replaceQuestionOptions] insert", insertError.message);
    return { message: "No se pudieron guardar las opciones." };
  }

  return { success: true };
}

// ── getQuizAttempts ───────────────────────────────────────────────────────────
// Obtiene todos los intentos de alumnos para el quiz ligado a una lección.

export async function getQuizAttempts(lessonId: string): Promise<AttemptRow[]> {
  const supabase = supabaseAdmin;

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id")
    .eq("lesson_id", lessonId)
    .single();

  if (!quiz) return [];

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select(
      `
      id, score, passed, started_at, finished_at,
      student:profiles!student_id(full_name)
    `
    )
    .eq("quiz_id", quiz.id)
    .order("started_at", { ascending: false });

  if (error || !data) {
    console.error("[getQuizAttempts]", error?.message);
    return [];
  }

  return data.map((a) => ({
    id: a.id,
    score: a.score,
    passed: a.passed,
    started_at: a.started_at,
    finished_at: a.finished_at,
    student_name: (a.student as any)?.full_name ?? "—",
  }));
}

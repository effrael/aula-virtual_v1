"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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

// ── Student: getMyAttempts ────────────────────────────────────────────────────

export type MyAttempt = {
  id: string;
  score: number | null;
  passed: boolean | null;
  started_at: string;
  finished_at: string | null;
};

export async function getMyAttempts(lessonId: string): Promise<MyAttempt[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: quiz } = await supabaseAdmin
    .from("quizzes").select("id").eq("lesson_id", lessonId).maybeSingle();
  if (!quiz) return [];

  const { data } = await supabaseAdmin
    .from("quiz_attempts")
    .select("id, score, passed, started_at, finished_at")
    .eq("quiz_id", quiz.id)
    .eq("student_id", user.id)
    .order("started_at", { ascending: false });

  return (data ?? []) as MyAttempt[];
}

// ── Student: getQuizForStudent ────────────────────────────────────────────────
// Obtiene quiz + intentos del alumno en una sola acción (sin auto-crear).

export async function getQuizForStudent(lessonId: string): Promise<{
  quiz: QuizData | null;
  attempts: MyAttempt[];
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Obtener quiz con preguntas y opciones
  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .select(
      `id, time_limit_mins, randomize, passing_score, is_certification, max_attempts,
       quiz_questions(id, body, type, position, points,
         quiz_options(id, body, is_correct, position)
       )`
    )
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) {
    console.error("[getQuizForStudent] quiz:", error.message);
    return { quiz: null, attempts: [] };
  }

  const quiz: QuizData | null = data
    ? {
        id: data.id,
        time_limit_mins: data.time_limit_mins,
        randomize: data.randomize,
        passing_score: data.passing_score,
        is_certification: data.is_certification,
        max_attempts: data.max_attempts,
        questions: ((data.quiz_questions as any[]) ?? [])
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
          })),
      }
    : null;

  // Obtener intentos del alumno (solo si hay quiz y usuario autenticado)
  let attempts: MyAttempt[] = [];
  if (quiz && user) {
    const { data: attemptsData } = await supabaseAdmin
      .from("quiz_attempts")
      .select("id, score, passed, started_at, finished_at")
      .eq("quiz_id", quiz.id)
      .eq("student_id", user.id)
      .order("started_at", { ascending: false });
    attempts = (attemptsData ?? []) as MyAttempt[];
  }

  return { quiz, attempts };
}

// ── Student: startAttempt ─────────────────────────────────────────────────────

export async function startAttempt(
  lessonId: string
): Promise<{ attemptId?: string; message?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "No autenticado." };

  const { data: quiz } = await supabaseAdmin
    .from("quizzes")
    .select("id, max_attempts")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (!quiz) return { message: "Quiz no encontrado." };

  if (quiz.max_attempts !== null) {
    const { count } = await supabaseAdmin
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quiz.id)
      .eq("student_id", user.id)
      .not("finished_at", "is", null);

    if ((count ?? 0) >= quiz.max_attempts)
      return { message: "Has alcanzado el límite de intentos para este quiz." };
  }

  const { data: attempt, error } = await supabaseAdmin
    .from("quiz_attempts")
    .insert({ quiz_id: quiz.id, student_id: user.id })
    .select("id")
    .single();

  if (error || !attempt) {
    console.error("[startAttempt]", error?.message);
    return { message: "No se pudo iniciar el intento." };
  }

  return { attemptId: attempt.id };
}

// ── Student: submitAttempt ────────────────────────────────────────────────────

export async function submitAttempt(
  attemptId: string,
  lessonId: string,
  answers: Record<string, string[] | string>   // { questionId → selectedOptionIds[] | textAnswer }
): Promise<{ score?: number; passed?: boolean; message?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "No autenticado." };

  // Verificar que el intento pertenece al alumno
  const { data: attempt } = await supabaseAdmin
    .from("quiz_attempts")
    .select("id, quiz_id, student_id, finished_at")
    .eq("id", attemptId)
    .single();

  if (!attempt || attempt.student_id !== user.id)
    return { message: "Intento no válido." };
  if (attempt.finished_at)
    return { message: "Este intento ya fue enviado." };

  // Obtener quiz con preguntas y opciones correctas
  const { data: quizData } = await supabaseAdmin
    .from("quizzes")
    .select(`
      passing_score,
      quiz_questions(
        id, type, points,
        quiz_options(id, is_correct)
      )
    `)
    .eq("id", attempt.quiz_id)
    .single();

  if (!quizData) return { message: "Quiz no encontrado." };

  const questions = (quizData.quiz_questions as any[]) ?? [];

  // ── Calcular score ────────────────────────────────────────────────────────
  let totalPoints = 0;
  let earnedPoints = 0;

  for (const q of questions) {
    if (q.type === "opinion") {
      // Opinión: suma automáticamente sus puntos
      totalPoints += q.points;
      earnedPoints += q.points;
      continue;
    }

    totalPoints += q.points;
    const selected: string[] = Array.isArray(answers[q.id])
      ? (answers[q.id] as string[])
      : answers[q.id] ? [answers[q.id] as string] : [];

    const correctIds: string[] = (q.quiz_options as any[])
      .filter((o: any) => o.is_correct)
      .map((o: any) => o.id);

    const isCorrect =
      selected.length === correctIds.length &&
      selected.every((id) => correctIds.includes(id));

    if (isCorrect) earnedPoints += q.points;
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;
  const passed = score >= quizData.passing_score;

  // ── Guardar respuestas ────────────────────────────────────────────────────
  const answerRows = Object.entries(answers).map(([questionId, val]) => ({
    attempt_id: attemptId,
    question_id: questionId,
    selected_options: Array.isArray(val) ? val : typeof val === "string" && !val.startsWith("{") ? null : val,
    text_answer: typeof val === "string" && !Array.isArray(val) ? val : null,
  }));

  if (answerRows.length > 0) {
    await supabaseAdmin.from("quiz_answers").insert(answerRows);
  }

  // ── Cerrar intento ────────────────────────────────────────────────────────
  await supabaseAdmin
    .from("quiz_attempts")
    .update({ score, passed, finished_at: new Date().toISOString() })
    .eq("id", attemptId);

  // ── Marcar lección como completada si aprobó ──────────────────────────────
  if (passed) {
    await supabaseAdmin.from("lesson_progress").upsert(
      { lesson_id: lessonId, student_id: user.id, completed: true, completed_at: new Date().toISOString() },
      { onConflict: "lesson_id,student_id" }
    );
  }

  return { score, passed };
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

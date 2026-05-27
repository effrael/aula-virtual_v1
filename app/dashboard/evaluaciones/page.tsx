import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

type EvalItem = {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  bestScore: number | null;
  passed: boolean | null;
  totalAttempts: number;
  maxAttempts: number | null;
};

export default async function EvaluacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get enrolled courses
  const { data: enrollments } = await supabaseAdmin
    .from("enrollments")
    .select("course_id")
    .eq("student_id", user.id);

  const courseIds = (enrollments ?? []).map((e) => e.course_id);

  if (courseIds.length === 0) {
    return (
      <>
        <PageHeader>
          <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
            Evaluaciones
          </h1>
        </PageHeader>
        <main className="flex flex-col items-center justify-center gap-3 p-6 py-16 text-[var(--color-neutral-400)]">
          <ClipboardList className="size-12" />
          <p className="text-sm">No estás inscrito en ningún curso.</p>
        </main>
      </>
    );
  }

  // Get quiz lessons + all student attempts in parallel (2 queries, no N+1)
  const [{ data: lessonsData }, { data: allAttempts }] = await Promise.all([
    supabaseAdmin
      .from("lessons")
      .select(`
        id, title,
        module:modules!module_id(
          course_id,
          course:courses!course_id(id, title)
        ),
        quiz:quizzes!lesson_id(id, max_attempts)
      `)
      .eq("type", "quiz")
      .is("deleted_at", null),
    supabaseAdmin
      .from("quiz_attempts")
      .select("quiz_id, score, passed, finished_at")
      .eq("student_id", user.id)
      .not("finished_at", "is", null),
  ]);

  // Index attempts by quiz_id
  const attemptsByQuiz = new Map<string, { score: number | null; passed: boolean | null }[]>();
  for (const a of allAttempts ?? []) {
    const list = attemptsByQuiz.get(a.quiz_id) ?? [];
    list.push({ score: a.score, passed: a.passed });
    attemptsByQuiz.set(a.quiz_id, list);
  }

  // Build eval items (in-memory, no extra queries)
  const evalItems: EvalItem[] = [];

  for (const lesson of lessonsData ?? []) {
    const mod = lesson.module as any;
    const courseId = mod?.course_id;
    if (!courseId || !courseIds.includes(courseId)) continue;

    const quiz = Array.isArray(lesson.quiz) ? lesson.quiz[0] : lesson.quiz;
    if (!quiz) continue;

    const attempts = attemptsByQuiz.get(quiz.id) ?? [];
    const bestAttempt = attempts.length > 0
      ? attempts.reduce((best, a) => (a.score ?? 0) > (best.score ?? 0) ? a : best)
      : null;

    evalItems.push({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      courseId,
      courseTitle: (mod?.course as any)?.title ?? "",
      bestScore: bestAttempt?.score ?? null,
      passed: bestAttempt?.passed ?? null,
      totalAttempts: attempts.length,
      maxAttempts: quiz.max_attempts,
    });
  }

  return (
    <>
      <PageHeader>
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Evaluaciones
        </h1>
      </PageHeader>

      <main className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">
            Mis Evaluaciones
          </h2>
          <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
            Evaluaciones de los cursos en los que estás inscrito.
          </p>
        </div>

        {evalItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--color-neutral-400)]">
            <ClipboardList className="size-12" />
            <p className="text-sm">No hay evaluaciones disponibles.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-neutral-100)] bg-[var(--color-neutral-50)]">
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)]">
                    Evaluación
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)] hidden sm:table-cell">
                    Curso
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)]">
                    Estado
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)] hidden md:table-cell">
                    Intentos
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-neutral-100)]">
                {evalItems.map((item) => (
                  <tr key={item.lessonId} className="hover:bg-[var(--color-neutral-50)] transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-medium text-[var(--color-neutral-900)]">
                        {item.lessonTitle}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-neutral-500)] hidden sm:table-cell">
                      {item.courseTitle}
                    </td>
                    <td className="px-5 py-3">
                      {item.totalAttempts === 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)]">
                          <Clock className="size-3" />
                          Pendiente
                        </span>
                      ) : item.passed ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          <CheckCircle2 className="size-3" />
                          Aprobado ({item.bestScore}%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          <XCircle className="size-3" />
                          No aprobado ({item.bestScore}%)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--color-neutral-400)] hidden md:table-cell">
                      {item.totalAttempts}{item.maxAttempts ? `/${item.maxAttempts}` : ""}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/dashboard/courses/${item.courseId}?lesson=${item.lessonId}`}
                        className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                      >
                        <ExternalLink className="size-3" />
                        Ir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

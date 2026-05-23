"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Play,
  FileText,
  HelpCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Lock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./video-player";
import { LinkLesson } from "./link-lesson";
import { QuizLesson } from "./quiz-lesson";
import { getQuizForStudent, type QuizData, type MyAttempt } from "@/app/actions/quizzes";
import { markLessonComplete } from "@/app/actions/lesson-progress";
import { ResourcesTab } from "./lesson-resources-tab";
import { CommentsTab } from "./lesson-comments-tab";
import { NotesTab } from "./lesson-notes-tab";
import type { CourseWithModules, LessonRow } from "@/lib/queries/modules";

// ── Types ─────────────────────────────────────────────────────────────────────

type LessonWithContext = LessonRow & { moduleTitle: string };

const lessonTypeIcon = {
  video: Play,
  link: FileText,
  quiz: HelpCircle,
} as const;

// ── QuizLessonLoader ──────────────────────────────────────────────────────────

type QuizLoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; quiz: QuizData; attempts: MyAttempt[] };

function QuizLessonLoader({
  lessonId,
  alreadyPassed,
  onPassed,
}: {
  lessonId: string;
  alreadyPassed: boolean;
  onPassed: () => void;
}) {
  const [state, setState] = useState<QuizLoadState>({ status: "loading" });

  useEffect(() => {
    setState({ status: "loading" });
    getQuizForStudent(lessonId)
      .then(({ quiz, attempts }) => {
        if (!quiz) {
          setState({ status: "empty" });
        } else {
          setState({ status: "ready", quiz, attempts });
        }
      })
      .catch(() => setState({ status: "error" }));
  }, [lessonId]);

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl border border-[var(--color-neutral-200)] bg-white">
        <Loader2 className="size-6 text-[var(--color-neutral-300)] animate-spin" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl border border-red-100 bg-red-50">
        <p className="text-sm text-red-500">No se pudo cargar el quiz. Recarga la página.</p>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl border border-[var(--color-neutral-200)] bg-white">
        <p className="text-sm text-[var(--color-neutral-400)]">El quiz aún no tiene preguntas configuradas.</p>
      </div>
    );
  }

  return (
    <QuizLesson
      lessonId={lessonId}
      quiz={state.quiz}
      pastAttempts={state.attempts}
      alreadyPassed={alreadyPassed}
      onPassed={onPassed}
    />
  );
}


// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  course: CourseWithModules;
  initialCompleted?: string[];
  userId: string;
  userFullName?: string;
}

export function StudentCourseView({ course, initialCompleted = [], userId }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const activeModules = course.modules.filter((m) => m.is_active);

  const allLessons: LessonWithContext[] = activeModules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))
  );

  // Lección inicial: tomar de ?lesson= si es válida, sino la primera
  const paramLesson  = searchParams.get("lesson");
  const initialId    = allLessons.find((l) => l.id === paramLesson)?.id ?? allLessons[0]?.id ?? null;

  // Hidratar estado inicial desde la base de datos
  const initialCompletedSet = new Set(initialCompleted);

  const [selectedId,   setSelectedIdState] = useState<string | null>(initialId);
  const [completed,    setCompleted]        = useState<Set<string>>(initialCompletedSet);
  const [videoWatched, setVideoWatched]     = useState<Set<string>>(() =>
    new Set(allLessons.filter((l) => l.type === "video" && initialCompletedSet.has(l.id)).map((l) => l.id))
  );
  const [linkOpened,   setLinkOpened]       = useState<Set<string>>(() =>
    new Set(allLessons.filter((l) => l.type === "link"  && initialCompletedSet.has(l.id)).map((l) => l.id))
  );
  const [quizPassed,   setQuizPassed]       = useState<Set<string>>(() =>
    new Set(allLessons.filter((l) => l.type === "quiz"  && initialCompletedSet.has(l.id)).map((l) => l.id))
  );
  const [activeTab,    setActiveTab]        = useState("recursos");

  // Actualiza estado + URL al cambiar de lección
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    if (id) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("lesson", id);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [router, searchParams]);

  const currentIndex = allLessons.findIndex((l) => l.id === selectedId);
  const selected = allLessons[currentIndex] ?? null;
  const prev = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const next =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const progress =
    allLessons.length > 0
      ? Math.round((completed.size / allLessons.length) * 100)
      : 0;

  // Una lección de certificación solo se desbloquea cuando TODAS las anteriores están completadas
  function isCertificationLocked(lesson: LessonWithContext): boolean {
    if (!lesson.is_certification) return false;
    const idx = allLessons.findIndex((l) => l.id === lesson.id);
    return allLessons.slice(0, idx).some((l) => !completed.has(l.id));
  }

  // Botón bloqueado según tipo:
  // - video  → debe ver el 95% del video
  // - link   → debe subir su archivo de evidencia
  // - quiz   → debe aprobar el quiz
  const canMark =
    !selected ||
    (selected.type === "video" && videoWatched.has(selectedId ?? "")) ||
    (selected.type === "link"  && linkOpened.has(selectedId ?? ""))   ||
    (selected.type === "quiz"  && quizPassed.has(selectedId ?? ""));

  function markAndContinue() {
    if (!canMark || !selectedId) return;
    setCompleted((p) => new Set([...p, selectedId]));
    markLessonComplete(selectedId); // fire-and-forget, persiste en BD
    if (next) setSelectedId(next.id);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex overflow-hidden" style={{ height: "calc(100svh - 3.5rem)" }}>
      {/* ── Sidebar de navegación ── */}
      <aside className="w-64 shrink-0 border-r border-[var(--color-neutral-200)] bg-white flex flex-col min-h-0">
        {/* Info del curso + progreso */}
        <div className="p-4 border-b border-[var(--color-neutral-200)]">
          <p className="text-xs font-bold text-primary truncate leading-snug">
            {course.title}
          </p>
          <p className="text-xs text-[var(--color-neutral-500)] mt-1.5">
            {completed.size} de {allLessons.length} lecciones · {progress}%
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--color-neutral-100)] overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Lista de módulos y lecciones */}
        <nav className="flex-1 overflow-y-auto pb-4 divide-y divide-[var(--color-neutral-200)]">
          {activeModules.map((mod, mi) => (
            <div key={mod.id} className="py-2">
              <p className="px-4 pt-4 pb-1.5 text-sm font-semibold">
                {mi + 1}. {mod.title}
              </p>
              {mod.lessons.map((lesson) => {
                const Icon = lessonTypeIcon[lesson.type];
                const isSelected = lesson.id === selectedId;
                const isDone = completed.has(lesson.id);
                const certLocked = isCertificationLocked(lesson);

                return (
                  <button
                    key={lesson.id}
                    onClick={() => !certLocked && setSelectedId(lesson.id)}
                    disabled={certLocked}
                    title={certLocked ? "Completa todas las lecciones anteriores para desbloquear" : undefined}
                    className={`w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition-colors ${
                      certLocked
                        ? "cursor-not-allowed opacity-50"
                        : isSelected
                          ? "bg-primary/8 border-r-2 border-primary cursor-pointer"
                          : "hover:bg-[var(--color-neutral-50)] cursor-pointer"
                    }`}
                  >
                    {certLocked ? (
                      <Lock className="size-4 shrink-0 mt-0.5 text-[var(--color-neutral-400)]" />
                    ) : isDone ? (
                      <CheckCircle className="size-4 shrink-0 mt-0.5 text-green-500" />
                    ) : (
                      <Icon
                        className={`size-4 shrink-0 mt-0.5 ${
                          isSelected
                            ? "text-primary"
                            : "text-[var(--color-neutral-400)]"
                        }`}
                      />
                    )}
                    <p
                      className={`text-xs leading-snug font-semibold ${
                        isSelected && !certLocked
                          ? "text-primary"
                          : isDone
                            ? "text-[var(--color-neutral-500)] opacity-90"
                            : "text-[var(--color-neutral-700)] opacity-50"
                      }`}
                    >
                      {lesson.title}
                    </p>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Contenido de la lección ── */}
      <div className="flex-1 overflow-y-auto bg-sidebar">
        {selected ? (
          <div className="px-6 py-6 flex flex-col gap-5">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-[var(--color-neutral-500)]">
              <a
                href="/dashboard/courses"
                className="hover:text-[var(--color-neutral-900)] transition-colors"
              >
                Mis cursos
              </a>
              <ChevronRight className="size-3 shrink-0" />
              <span className="truncate max-w-[10rem]">{course.title}</span>
              <ChevronRight className="size-3 shrink-0" />
              <span className="text-[var(--color-neutral-900)] font-medium truncate max-w-[14rem]">
                {selected.title}
              </span>
            </nav>

            {/* Título */}
            <h1 className="text-2xl font-bold text-[var(--color-neutral-900)] leading-snug">
              {selected.title}
            </h1>

            {/* Área de contenido según tipo */}
            {selected.type === "video" && (
              selected.hls_url ? (
                <VideoPlayer
                  hlsUrl={selected.hls_url}
                  lessonId={selected.id}
                  onComplete={() =>
                    setVideoWatched((p) => new Set([...p, selected.id]))
                  }
                />
              ) : (
                <div className="rounded-xl overflow-hidden bg-neutral-900 aspect-video flex items-center justify-center">
                  <p className="text-sm text-white/40">Video no disponible</p>
                </div>
              )
            )}

            {selected.type === "link" && (
              <LinkLesson
                lessonId={selected.id}
                url={selected.external_url}
                submitted={linkOpened.has(selected.id)}
                onSubmitted={() =>
                  setLinkOpened((p) => new Set([...p, selected.id]))
                }
              />
            )}

            {selected.type === "quiz" && (
              isCertificationLocked(selected) ? (
                <div className="flex flex-col items-center justify-center gap-4 p-10 rounded-xl border border-[var(--color-neutral-200)] bg-white text-center">
                  <span className="flex items-center justify-center size-14 rounded-full bg-[var(--color-neutral-100)]">
                    <Lock className="size-6 text-[var(--color-neutral-400)]" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-[var(--color-neutral-900)]">
                      Examen bloqueado
                    </p>
                    <p className="text-sm text-[var(--color-neutral-500)] mt-1 max-w-sm">
                      Debes completar todas las lecciones anteriores del curso para acceder al examen de certificación.
                    </p>
                  </div>
                  <p className="text-xs text-[var(--color-neutral-400)]">
                    {allLessons.slice(0, allLessons.findIndex((l) => l.id === selected.id)).filter((l) => !completed.has(l.id)).length} lecciones pendientes
                  </p>
                </div>
              ) : (
                <QuizLessonLoader
                  lessonId={selected.id}
                  alreadyPassed={quizPassed.has(selected.id)}
                  onPassed={() => setQuizPassed((p) => new Set([...p, selected.id]))}
                />
              )
            )}

            {/* Navegación entre lecciones */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                disabled={!prev}
                onClick={() => prev && setSelectedId(prev.id)}
              >
                <ChevronLeft className="size-4" />
                Lección anterior
              </Button>

              <span className="text-xs text-[var(--color-neutral-400)]">
                {currentIndex + 1} de {allLessons.length}
              </span>

              <Button
                onClick={markAndContinue}
                disabled={
                  (selected ? isCertificationLocked(selected) : false) ||
                  !canMark ||
                  (!next && completed.has(selectedId ?? ""))
                }
                title={
                  selected && isCertificationLocked(selected)
                    ? "Completa todas las lecciones anteriores primero"
                    : !canMark
                      ? "Completa la lección para continuar"
                      : undefined
                }
              >
                {(!canMark || (selected ? isCertificationLocked(selected) : false)) && <Lock className="size-3.5" />}
                {next ? "Marcar y continuar" : "Marcar como completado"}
                {canMark && !(selected ? isCertificationLocked(selected) : false) && <ChevronRight className="size-4" />}
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex flex-col gap-4">
              <div className="flex gap-0 border-b border-[var(--color-neutral-200)]">
                {[
                  { id: "recursos", label: "Recursos" },
                  { id: "comentarios", label: "Comentarios" },
                  { id: "notas", label: "Mis notas" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "recursos" && selectedId && (
                <ResourcesTab lessonId={selectedId} />
              )}

              {activeTab === "comentarios" && selectedId && (
                <CommentsTab lessonId={selectedId} userId={userId} />
              )}

              {activeTab === "notas" && selectedId && (
                <NotesTab lessonId={selectedId} />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-20 text-center">
            <BookOpen className="size-10 text-[var(--color-neutral-300)]" />
            <p className="text-sm text-[var(--color-neutral-500)]">
              Selecciona una lección para comenzar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

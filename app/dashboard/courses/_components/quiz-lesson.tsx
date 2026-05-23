"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  RotateCcw, Trophy, AlertTriangle, Loader2, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startAttempt, submitAttempt, type MyAttempt, type QuizData } from "@/app/actions/quizzes";

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = "idle" | "taking" | "result";
type Answers = Record<string, string[] | string>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  lessonId: string;
  quiz: QuizData;
  pastAttempts: MyAttempt[];
  onPassed: () => void;      // desbloquea "Marcar y continuar"
  alreadyPassed: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function QuizLesson({ lessonId, quiz, pastAttempts, onPassed, alreadyPassed }: Props) {
  const [phase, setPhase]           = useState<Phase>("idle");
  const [attemptId, setAttemptId]   = useState<string | null>(null);
  const [questions, setQuestions]   = useState(quiz.questions);
  const [answers, setAnswers]       = useState<Answers>({});
  const [current, setCurrent]       = useState(0);
  const [timeLeft, setTimeLeft]     = useState<number | null>(null);
  const [result, setResult]         = useState<{ score: number; passed: boolean } | null>(null);
  const [pending, startTransition]  = useTransition();
  const timerRef                    = useRef<ReturnType<typeof setInterval> | null>(null);

  const finishedAttempts = pastAttempts.filter((a) => a.finished_at !== null);
  const attemptsUsed     = finishedAttempts.length;
  const attemptsLeft     = quiz.max_attempts !== null ? quiz.max_attempts - attemptsUsed : null;
  const maxReached       = attemptsLeft !== null && attemptsLeft <= 0;
  const bestScore        = finishedAttempts.reduce((best, a) => Math.max(best, a.score ?? 0), 0);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "taking" || timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft === null ? null : Math.floor(timeLeft / 10)]);

  // ── Iniciar intento ────────────────────────────────────────────────────────
  function handleStart() {
    startTransition(async () => {
      const res = await startAttempt(lessonId);
      if (!res.attemptId) { toast.error(res.message ?? "Error al iniciar."); return; }

      const qs = quiz.randomize
        ? shuffle(quiz.questions).map((q) => ({ ...q, options: shuffle(q.options) }))
        : quiz.questions;

      setAttemptId(res.attemptId);
      setQuestions(qs);
      setAnswers({});
      setCurrent(0);
      setResult(null);
      setTimeLeft(quiz.time_limit_mins !== null ? quiz.time_limit_mins * 60 : null);
      setPhase("taking");
    });
  }

  // ── Responder ──────────────────────────────────────────────────────────────
  function handleAnswer(questionId: string, optionId: string, type: "single" | "multiple" | "opinion") {
    setAnswers((prev) => {
      if (type === "single")   return { ...prev, [questionId]: [optionId] };
      if (type === "opinion")  return { ...prev, [questionId]: optionId };
      // multiple: toggle
      const current = (prev[questionId] as string[]) ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  }

  // ── Enviar ─────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!attemptId) return;
    if (timerRef.current) clearInterval(timerRef.current);

    startTransition(async () => {
      const res = await submitAttempt(attemptId, lessonId, answers);
      if (res.score === undefined) { toast.error(res.message ?? "Error al enviar."); return; }
      setResult({ score: res.score, passed: res.passed ?? false });
      setPhase("result");
      if (res.passed) onPassed();
    });
  }

  const q = questions[current];
  const selectedOptions = q ? ((answers[q.id] as string[]) ?? []) : [];

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE: IDLE
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === "idle") {
    return (
      <div className="flex flex-col gap-4">
        {/* Info card */}
        <div className="flex flex-col gap-5 p-6 rounded-xl border border-[var(--color-neutral-200)] bg-white">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-base font-semibold text-[var(--color-neutral-900)]">
                {quiz.is_certification ? "Examen final" : "Quiz de evaluación"}
              </p>
              <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
                Necesitas {quiz.passing_score}% para aprobar
              </p>
            </div>
            {alreadyPassed && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="size-3.5" /> Aprobado
              </span>
            )}
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Preguntas",    value: quiz.questions.length },
              { label: "Tiempo",       value: quiz.time_limit_mins ? `${quiz.time_limit_mins} min` : "Sin límite" },
              { label: "Mín. aprobado", value: `${quiz.passing_score}%` },
              { label: "Intentos",     value: quiz.max_attempts ? `${attemptsUsed}/${quiz.max_attempts}` : `${attemptsUsed} realizados` },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center justify-center gap-0.5 p-3 rounded-lg bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)]">
                <p className="text-base font-bold text-[var(--color-neutral-900)]">{s.value}</p>
                <p className="text-[10px] text-[var(--color-neutral-400)] uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Historial de intentos */}
          {finishedAttempts.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">
                Intentos anteriores
              </p>
              <div className="flex flex-col gap-1.5">
                {finishedAttempts.slice(0, 5).map((a, i) => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)]">
                    <span className="text-xs text-[var(--color-neutral-600)]">Intento {finishedAttempts.length - i}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${a.passed ? "text-green-600" : "text-red-500"}`}>
                        {a.score ?? "—"}%
                      </span>
                      {a.passed
                        ? <CheckCircle2 className="size-3.5 text-green-500" />
                        : <XCircle className="size-3.5 text-red-400" />
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          {quiz.questions.length === 0 ? (
            <p className="text-sm text-center text-[var(--color-neutral-400)]">Este quiz aún no tiene preguntas configuradas.</p>
          ) : maxReached && !alreadyPassed ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="size-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700">Has alcanzado el límite de intentos.</p>
            </div>
          ) : (
            <Button onClick={handleStart} disabled={pending} className="w-full">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {alreadyPassed ? (
                <><RotateCcw className="size-4" /> Volver a intentar</>
              ) : finishedAttempts.length > 0 ? (
                <><RotateCcw className="size-4" /> Reintentar</>
              ) : (
                "Comenzar quiz"
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE: TAKING
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === "taking" && q) {
    const isLast = current === questions.length - 1;
    const answered = answers[q.id] !== undefined &&
      (Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).length > 0 : (answers[q.id] as string).length > 0);

    return (
      <div className="flex flex-col gap-4">
        {/* Header: progreso + timer */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--color-neutral-500)]">
                Pregunta {current + 1} de {questions.length}
              </span>
              <span className="text-xs text-[var(--color-neutral-500)]">
                {Math.round(((current + 1) / questions.length) * 100)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-neutral-100)] overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((current + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold tabular-nums ${
              timeLeft < 60 ? "bg-red-50 text-red-600" : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)]"
            }`}>
              <Clock className="size-3.5" />
              {fmtTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Pregunta */}
        <div className="flex flex-col gap-4 p-6 rounded-xl border border-[var(--color-neutral-200)] bg-white">
          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-semibold text-[var(--color-neutral-900)] leading-snug">
              {q.body}
            </p>
            <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              q.type === "single"   ? "bg-blue-50 text-blue-600"   :
              q.type === "multiple" ? "bg-violet-50 text-violet-600" :
              "bg-amber-50 text-amber-600"
            }`}>
              {q.type === "single" ? "Una respuesta" : q.type === "multiple" ? "Varias respuestas" : "Opinión"}
            </span>
          </div>

          {/* Opciones */}
          {q.type === "opinion" ? (
            <textarea
              rows={4}
              placeholder="Escribe tu respuesta aquí…"
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => handleAnswer(q.id, e.target.value, "opinion")}
              className="w-full resize-none rounded-lg border border-[var(--color-neutral-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {q.options.map((opt) => {
                const selected = selectedOptions.includes(opt.id!);
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleAnswer(q.id, opt.id!, q.type as "single" | "multiple")}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left text-sm transition-colors ${
                      selected
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-[var(--color-neutral-200)] hover:border-primary/40 hover:bg-[var(--color-neutral-50)]"
                    }`}
                  >
                    <span className={`shrink-0 flex items-center justify-center size-5 rounded-full border-2 transition-colors ${
                      selected ? "border-primary bg-primary" : "border-[var(--color-neutral-300)]"
                    }`}>
                      {selected && <span className="size-2 rounded-full bg-white" />}
                    </span>
                    {opt.body}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Navegación */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={current === 0}
            onClick={() => setCurrent((c) => c - 1)}
          >
            <ChevronLeft className="size-4" /> Anterior
          </Button>

          {isLast ? (
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Finalizar quiz
            </Button>
          ) : (
            <Button
              onClick={() => setCurrent((c) => c + 1)}
              disabled={!answered}
            >
              Siguiente <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE: RESULT
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === "result" && result) {
    return (
      <div className="flex flex-col gap-4 p-6 rounded-xl border border-[var(--color-neutral-200)] bg-white items-center text-center">
        {result.passed ? (
          <Trophy className="size-12 text-amber-400" />
        ) : (
          <XCircle className="size-12 text-red-400" />
        )}

        <div>
          <p className="text-4xl font-bold tabular-nums" style={{
            color: result.passed ? "var(--color-primary, #6366f1)" : "#ef4444"
          }}>
            {result.score}%
          </p>
          <p className={`text-base font-semibold mt-1 ${result.passed ? "text-green-700" : "text-red-600"}`}>
            {result.passed ? "¡Aprobado!" : "No aprobado"}
          </p>
          <p className="text-xs text-[var(--color-neutral-500)] mt-1">
            Puntaje mínimo requerido: {quiz.passing_score}%
          </p>
        </div>

        {!result.passed && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 w-full text-left">
            <AlertTriangle className="size-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">
              {maxReached
                ? "Has alcanzado el límite de intentos."
                : quiz.is_certification
                  ? "Debes aprobar el examen final para obtener tu certificado."
                  : "Puedes continuar con el curso, pero te recomendamos repasar el contenido."}
            </p>
          </div>
        )}

        <div className="flex gap-3 w-full justify-center flex-wrap">
          {!maxReached && (
            <Button variant="outline" onClick={() => setPhase("idle")}>
              <RotateCcw className="size-4" /> Reintentar
            </Button>
          )}
          {result.passed && (
            <Button onClick={onPassed}>
              <CheckCircle2 className="size-4" /> Marcar y continuar
            </Button>
          )}
          {!result.passed && !quiz.is_certification && (
            <Button variant="outline" onClick={onPassed}>
              Continuar de todos modos
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

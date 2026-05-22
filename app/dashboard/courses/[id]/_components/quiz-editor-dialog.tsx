"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Award,
  BarChart2,
  ChevronLeft,
  ClipboardList,
  Clock,
  Pencil,
  Plus,
  RotateCcw,
  Shuffle,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getQuizByLessonId,
  saveQuizSettings,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  replaceQuestionOptions,
  type QuizData,
  type QuizQuestion,
  type QuizOption,
} from "@/app/actions/quizzes";
import type { LessonRow } from "@/lib/queries/modules";

type Props = {
  lesson: LessonRow;
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const QUESTION_TYPES = [
  { value: "single", label: "Una respuesta" },
  { value: "multiple", label: "Multirespuesta" },
  { value: "opinion", label: "Opinión" },
] as const;

const typeBadge: Record<string, string> = {
  single: "bg-blue-50 text-blue-600",
  multiple: "bg-violet-50 text-violet-600",
  opinion: "bg-green-50 text-green-600",
};

const typeLabel: Record<string, string> = {
  single: "Una resp.",
  multiple: "Multiresp.",
  opinion: "Opinión",
};

export function QuizEditorDialog({ lesson, courseId, open, onOpenChange }: Props) {
  // ── Quiz data ──────────────────────────────────────────────────────────────
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const [view, setView] = useState<"main" | "question">("main");
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

  // ── Settings form state ────────────────────────────────────────────────────
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(false);
  const [timeLimitMins, setTimeLimitMins] = useState(30);
  const [randomize, setRandomize] = useState(false);
  const [passingScore, setPassingScore] = useState(70);
  const [isCertification, setIsCertification] = useState(false);
  const [maxAttemptsEnabled, setMaxAttemptsEnabled] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(3);

  // ── Question form state ────────────────────────────────────────────────────
  const [qBody, setQBody] = useState("");
  const [qType, setQType] = useState<"single" | "multiple" | "opinion">("single");
  const [qPoints, setQPoints] = useState(1);
  const [qOptions, setQOptions] = useState<QuizOption[]>([]);
  const [newOptionBody, setNewOptionBody] = useState("");

  // ── Transitions ────────────────────────────────────────────────────────────
  const [settingsPending, startSettings] = useTransition();
  const [questionPending, startQuestion] = useTransition();
  const [deletePending, startDelete] = useTransition();

  // ── Load quiz on open ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setView("main");
    getQuizByLessonId(lesson.id)
      .then((data) => {
        setQuiz(data);
        if (data) {
          setTimeLimitEnabled(data.time_limit_mins !== null);
          setTimeLimitMins(data.time_limit_mins ?? 30);
          setRandomize(data.randomize);
          setPassingScore(data.passing_score);
          setIsCertification(data.is_certification);
          setMaxAttemptsEnabled(data.max_attempts !== null);
          setMaxAttempts(data.max_attempts ?? 3);
        }
      })
      .finally(() => setLoading(false));
  }, [open, lesson.id]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openQuestionEditor(q: QuizQuestion | null) {
    if (q) {
      setQBody(q.body);
      setQType(q.type);
      setQPoints(q.points);
      setQOptions(q.options.map((o) => ({ ...o })));
    } else {
      setQBody("");
      setQType("single");
      setQPoints(1);
      setQOptions([]);
    }
    setNewOptionBody("");
    setEditingQuestion(q);
    setView("question");
  }

  function handleSaveSettings() {
    if (!quiz) return;
    startSettings(async () => {
      const result = await saveQuizSettings(quiz.id, courseId, {
        time_limit_mins: timeLimitEnabled ? timeLimitMins : null,
        randomize,
        passing_score: passingScore,
        is_certification: isCertification,
        max_attempts: maxAttemptsEnabled ? maxAttempts : null,
      });
      if (result.success) {
        toast.success("Configuración guardada.");
        setQuiz((prev) =>
          prev
            ? {
                ...prev,
                time_limit_mins: timeLimitEnabled ? timeLimitMins : null,
                randomize,
                passing_score: passingScore,
                is_certification: isCertification,
                max_attempts: maxAttemptsEnabled ? maxAttempts : null,
              }
            : null
        );
      } else {
        toast.error(result.message ?? "Error al guardar.");
      }
    });
  }

  function handleSaveQuestion() {
    if (!quiz || !qBody.trim()) return;
    startQuestion(async () => {
      let questionId: string;

      if (editingQuestion) {
        const result = await updateQuestion(editingQuestion.id, courseId, {
          body: qBody.trim(),
          type: qType,
          points: qPoints,
        });
        if (!result.success) {
          toast.error(result.message ?? "Error al guardar la pregunta.");
          return;
        }
        questionId = editingQuestion.id;
      } else {
        const result = await createQuestion(quiz.id, courseId, {
          body: qBody.trim(),
          type: qType,
          points: qPoints,
        });
        if (!result.success || !result.id) {
          toast.error(result.message ?? "Error al crear la pregunta.");
          return;
        }
        questionId = result.id;
      }

      await replaceQuestionOptions(
        questionId,
        qType !== "opinion" ? qOptions.map((o) => ({ body: o.body, is_correct: o.is_correct })) : []
      );

      const updated = await getQuizByLessonId(lesson.id);
      setQuiz(updated);
      toast.success(editingQuestion ? "Pregunta actualizada." : "Pregunta creada.");
      setView("main");
    });
  }

  function handleDeleteQuestion(q: QuizQuestion) {
    startDelete(async () => {
      const result = await deleteQuestion(q.id, courseId);
      if (result.success) {
        setQuiz((prev) =>
          prev ? { ...prev, questions: prev.questions.filter((x) => x.id !== q.id) } : null
        );
        toast.success("Pregunta eliminada.");
      } else {
        toast.error(result.message ?? "Error al eliminar.");
      }
    });
  }

  function addOption() {
    if (!newOptionBody.trim()) return;
    setQOptions((prev) => [...prev, { body: newOptionBody.trim(), is_correct: false }]);
    setNewOptionBody("");
  }

  function toggleCorrect(idx: number) {
    setQOptions((prev) =>
      prev.map((o, i) => ({
        ...o,
        is_correct:
          qType === "single" ? i === idx : i === idx ? !o.is_correct : o.is_correct,
      }))
    );
  }

  function removeOption(idx: number) {
    setQOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-4" />
            {view === "main"
              ? `Quiz — ${lesson.title}`
              : editingQuestion
              ? "Editar pregunta"
              : "Nueva pregunta"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="py-12 text-center text-sm text-[var(--color-neutral-400)]">
            Cargando...
          </p>
        ) : !quiz ? (
          <p className="py-12 text-center text-sm text-[var(--color-neutral-400)]">
            No se pudo cargar el quiz.
          </p>
        ) : view === "main" ? (
          /* ── Vista principal ─────────────────────────────────────────────── */
          <div className="flex flex-col gap-6 pt-2">

            {/* Configuración */}
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-400)]">
                Configuración
              </p>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {/* Tiempo límite */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-neutral-700)]">
                    <input
                      type="checkbox"
                      checked={timeLimitEnabled}
                      onChange={(e) => setTimeLimitEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <Clock className="size-3.5" />
                    Tiempo límite
                  </label>
                  {timeLimitEnabled && (
                    <div className="flex items-center gap-2 pl-6">
                      <Input
                        type="number"
                        min={1}
                        value={timeLimitMins}
                        onChange={(e) => setTimeLimitMins(Number(e.target.value))}
                        className="w-20"
                      />
                      <span className="text-sm text-[var(--color-neutral-500)]">minutos</span>
                    </div>
                  )}
                </div>

                {/* Aleatorio */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-neutral-700)]">
                    <input
                      type="checkbox"
                      checked={randomize}
                      onChange={(e) => setRandomize(e.target.checked)}
                      className="rounded"
                    />
                    <Shuffle className="size-3.5" />
                    Preguntas aleatorias
                  </label>
                </div>

                {/* % mínimo */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-neutral-700)]">
                    <BarChart2 className="size-3.5" />
                    % mínimo para aprobar
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={passingScore}
                      onChange={(e) => setPassingScore(Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-[var(--color-neutral-500)]">%</span>
                  </div>
                </div>

                {/* Intentos máximos */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-neutral-700)]">
                    <input
                      type="checkbox"
                      checked={maxAttemptsEnabled}
                      onChange={(e) => setMaxAttemptsEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <RotateCcw className="size-3.5" />
                    Limitar intentos
                  </label>
                  {maxAttemptsEnabled && (
                    <div className="flex items-center gap-2 pl-6">
                      <Input
                        type="number"
                        min={1}
                        value={maxAttempts}
                        onChange={(e) => setMaxAttempts(Number(e.target.value))}
                        className="w-20"
                      />
                      <span className="text-sm text-[var(--color-neutral-500)]">intentos</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Examen de certificación */}
              <label className="flex items-start gap-2 text-sm font-medium text-[var(--color-neutral-700)]">
                <input
                  type="checkbox"
                  checked={isCertification}
                  onChange={(e) => setIsCertification(e.target.checked)}
                  className="rounded mt-0.5"
                />
                <span className="flex items-center gap-1.5">
                  <Award className="size-3.5 text-amber-500 shrink-0" />
                  Examen final de certificación
                  <span className="text-xs text-[var(--color-neutral-400)] font-normal">
                    — requerido para emitir el certificado del curso
                  </span>
                </span>
              </label>

              <Button
                onClick={handleSaveSettings}
                disabled={settingsPending}
                variant="outline"
                size="sm"
                className="w-fit"
              >
                {settingsPending ? "Guardando..." : "Guardar configuración"}
              </Button>
            </div>

            {/* Preguntas */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-400)]">
                  Preguntas ({quiz.questions.length})
                </p>
                <Button variant="outline" size="sm" onClick={() => openQuestionEditor(null)}>
                  <Plus className="size-3.5 mr-1.5" />
                  Agregar pregunta
                </Button>
              </div>

              {quiz.questions.length === 0 ? (
                <div className="py-10 text-center border border-dashed rounded-lg">
                  <p className="text-sm text-[var(--color-neutral-400)]">
                    Sin preguntas todavía.
                  </p>
                  <p className="text-xs text-[var(--color-neutral-300)] mt-1">
                    Agrega la primera pregunta con el botón de arriba.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
                  {quiz.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        deletePending ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      <span className="shrink-0 text-xs font-bold text-[var(--color-neutral-400)] w-5 text-center">
                        {idx + 1}
                      </span>
                      <p className="flex-1 text-sm text-[var(--color-neutral-800)] truncate">
                        {q.body}
                      </p>
                      <span
                        className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge[q.type]}`}
                      >
                        {typeLabel[q.type]}
                      </span>
                      <span className="shrink-0 text-xs text-[var(--color-neutral-400)]">
                        {q.points} pt{q.points !== 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={() => openQuestionEditor(q)}
                        className="shrink-0 p-1 rounded-md hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-400)]"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q)}
                        disabled={deletePending}
                        className="shrink-0 p-1 rounded-md hover:bg-red-50 hover:text-red-500 text-[var(--color-neutral-400)]"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Vista editor de pregunta ────────────────────────────────────── */
          <div className="flex flex-col gap-5 pt-2">
            <button
              onClick={() => setView("main")}
              className="flex items-center gap-1.5 text-sm text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] w-fit transition-colors"
            >
              <ChevronLeft className="size-4" />
              Volver a preguntas
            </button>

            {/* Tipo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-neutral-700)]">
                Tipo
              </label>
              <div className="flex gap-2">
                {QUESTION_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setQType(value)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      qType === value
                        ? "border-[var(--color-primary)] bg-violet-50 text-[var(--color-primary)]"
                        : "border-[var(--color-neutral-200)] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-50)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuerpo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-neutral-700)]">
                Pregunta <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={qBody}
                onChange={(e) => setQBody(e.target.value)}
                placeholder="Escribe la pregunta aquí..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Puntos */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-neutral-700)]">
                Puntos
              </label>
              <Input
                type="number"
                min={1}
                value={qPoints}
                onChange={(e) => setQPoints(Number(e.target.value))}
                className="w-24"
              />
            </div>

            {/* Opciones (single / multiple) */}
            {qType !== "opinion" && (
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-[var(--color-neutral-700)]">
                  Opciones{" "}
                  <span className="text-xs font-normal text-[var(--color-neutral-400)]">
                    {qType === "single"
                      ? "— selecciona la única correcta"
                      : "— selecciona todas las correctas"}
                  </span>
                </label>

                <div className="flex flex-col gap-2">
                  {qOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type={qType === "single" ? "radio" : "checkbox"}
                        checked={opt.is_correct}
                        onChange={() => toggleCorrect(idx)}
                        name="quiz-option-correct"
                        className="shrink-0 accent-[var(--color-primary)]"
                      />
                      <Input
                        value={opt.body}
                        onChange={(e) =>
                          setQOptions((prev) =>
                            prev.map((o, i) =>
                              i === idx ? { ...o, body: e.target.value } : o
                            )
                          )
                        }
                        className="flex-1"
                        placeholder={`Opción ${idx + 1}`}
                      />
                      <button
                        onClick={() => removeOption(idx)}
                        className="shrink-0 p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-[var(--color-neutral-400)] transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Nueva opción */}
                  <div className="flex gap-2">
                    <Input
                      value={newOptionBody}
                      onChange={(e) => setNewOptionBody(e.target.value)}
                      placeholder="Nueva opción..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOption();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addOption}
                      disabled={!newOptionBody.trim()}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {qType === "opinion" && (
              <p className="text-xs text-[var(--color-neutral-500)] bg-[var(--color-neutral-50)] rounded-lg px-3 py-2.5">
                Las preguntas de opinión son de respuesta libre. No se califican automáticamente y no suman al score final.
              </p>
            )}

            <Button
              onClick={handleSaveQuestion}
              disabled={questionPending || !qBody.trim()}
              className="text-white w-full mt-1"
            >
              {questionPending
                ? "Guardando..."
                : editingQuestion
                ? "Guardar cambios"
                : "Crear pregunta"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import { BarChart2, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getQuizAttempts, type AttemptRow } from "@/app/actions/quizzes";
import type { LessonRow } from "@/lib/queries/modules";

type Props = {
  lesson: LessonRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QuizAttemptsDialog({ lesson, open, onOpenChange }: Props) {
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getQuizAttempts(lesson.id)
      .then(setAttempts)
      .finally(() => setLoading(false));
  }, [open, lesson.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="size-4" />
            Intentos — {lesson.title}
          </DialogTitle>
        </DialogHeader>

        <div className="pt-1">
          {loading ? (
            <p className="py-10 text-center text-sm text-[var(--color-neutral-400)]">
              Cargando...
            </p>
          ) : attempts.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-neutral-400)] border border-dashed rounded-lg">
              Ningún alumno ha intentado este quiz todavía.
            </p>
          ) : (
            <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
              {attempts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  {/* Nombre y fecha */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-neutral-800)] truncate">
                      {a.student_name}
                    </p>
                    <p className="text-xs text-[var(--color-neutral-400)]">
                      {new Date(a.started_at).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Score */}
                  {a.score !== null && (
                    <span className="text-sm font-semibold text-[var(--color-neutral-700)]">
                      {a.score}%
                    </span>
                  )}

                  {/* Estado */}
                  {a.passed === null ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-[var(--color-neutral-500)] bg-[var(--color-neutral-100)] px-2 py-0.5 rounded-full">
                      <Clock className="size-3" />
                      En progreso
                    </span>
                  ) : a.passed ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      <CheckCircle className="size-3" />
                      Aprobado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      <XCircle className="size-3" />
                      Reprobado
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

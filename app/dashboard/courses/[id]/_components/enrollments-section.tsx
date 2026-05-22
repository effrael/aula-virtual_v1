"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus, UserX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { enrollStudent, unenrollStudent } from "@/app/actions/enrollments";
import type { EnrollmentRow, StudentRow } from "@/lib/queries/enrollments";

type Props = {
  courseId: string;
  enrollments: EnrollmentRow[];
  students: StudentRow[];
};

export function EnrollmentsSection({ courseId, enrollments, students }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const enrolledIds = new Set(enrollments.map((e) => e.student_id));
  const available = students.filter(
    (s) =>
      !enrolledIds.has(s.id) &&
      s.full_name.toLowerCase().includes(search.toLowerCase())
  );

  function handleEnroll(studentId: string) {
    startTransition(async () => {
      const result = await enrollStudent(courseId, studentId);
      if (result?.success) {
        toast.success("Alumno inscrito correctamente.");
        setOpen(false);
        setSearch("");
      } else {
        toast.error(result?.message ?? "Error al inscribir al alumno.");
      }
    });
  }

  function handleUnenroll(enrollmentId: string) {
    startTransition(async () => {
      const result = await unenrollStudent(enrollmentId, courseId);
      if (result?.success) {
        toast.success("Alumno removido del curso.");
      } else {
        toast.error(result?.message ?? "Error al quitar al alumno.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-neutral-900)]">
            Alumnos inscritos
          </h2>
          <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
            {enrollments.length}{" "}
            {enrollments.length === 1 ? "alumno inscrito" : "alumnos inscritos"}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <UserPlus className="size-4 mr-1.5" />
              Inscribir alumno
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Inscribir alumno</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-3 pt-1">
              <Input
                placeholder="Buscar alumno..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />

              <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
                {available.length === 0 ? (
                  <p className="text-xs text-[var(--color-neutral-400)] text-center py-8">
                    {search
                      ? "Sin resultados."
                      : "Todos los alumnos ya están inscritos."}
                  </p>
                ) : (
                  available.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-[var(--color-neutral-50)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center size-7 rounded-full bg-[var(--color-neutral-100)] text-xs font-semibold text-[var(--color-neutral-600)] shrink-0">
                          {s.full_name.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm text-[var(--color-neutral-800)]">
                          {s.full_name}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => handleEnroll(s.id)}
                      >
                        Inscribir
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {enrollments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-xl bg-white">
          <Users className="size-8 text-[var(--color-neutral-300)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-neutral-700)]">
              Sin alumnos inscritos
            </p>
            <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">
              Inscribe el primer alumno usando el botón de arriba.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col divide-y bg-white border rounded-xl overflow-hidden">
          {enrollments.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center size-8 rounded-full bg-[var(--color-neutral-100)] text-sm font-semibold text-[var(--color-neutral-600)] shrink-0">
                  {e.full_name.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-[var(--color-neutral-800)]">
                  {e.full_name}
                </span>
              </div>

              <button
                onClick={() => handleUnenroll(e.id)}
                disabled={pending}
                title="Quitar del curso"
                className="p-1.5 rounded-md text-[var(--color-neutral-400)] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <UserX className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus, UserX, Users, ChevronLeft, ChevronRight } from "lucide-react";
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
  total: number;
  page: number;
  pageSize: number;
};

export function EnrollmentsSection({
  courseId,
  enrollments,
  students,
  total,
  page,
  pageSize,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
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
            {total} {total === 1 ? "alumno inscrito" : "alumnos inscritos"}
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

      {total === 0 ? (
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
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-[var(--color-neutral-50)]">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">
                  Nombre y apellidos
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">
                  Email
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">
                  DNI
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-neutral-100)]">
              {enrollments.map((e) => (
                <tr key={e.id} className="hover:bg-[var(--color-neutral-50)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center size-7 rounded-full bg-[var(--color-neutral-100)] text-xs font-semibold text-[var(--color-neutral-600)] shrink-0">
                        {e.full_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium text-[var(--color-neutral-800)]">
                        {e.full_name} {e.apellidos}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-neutral-600)]">
                    {e.email || <span className="text-[var(--color-neutral-300)]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-neutral-600)] font-mono text-xs">
                    {e.dni || <span className="text-[var(--color-neutral-300)]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleUnenroll(e.id)}
                      disabled={pending}
                      title="Quitar del curso"
                      className="p-1.5 rounded-md text-[var(--color-neutral-400)] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <UserX className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t bg-[var(--color-neutral-50)]">
              <p className="text-xs text-[var(--color-neutral-500)]">
                Página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <a
                  href={`?page=${page - 1}`}
                  aria-disabled={page <= 1}
                  className={`p-1.5 rounded-md transition-colors ${
                    page <= 1
                      ? "pointer-events-none text-[var(--color-neutral-300)]"
                      : "text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)]"
                  }`}
                >
                  <ChevronLeft className="size-4" />
                </a>
                <a
                  href={`?page=${page + 1}`}
                  aria-disabled={page >= totalPages}
                  className={`p-1.5 rounded-md transition-colors ${
                    page >= totalPages
                      ? "pointer-events-none text-[var(--color-neutral-300)]"
                      : "text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)]"
                  }`}
                >
                  <ChevronRight className="size-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

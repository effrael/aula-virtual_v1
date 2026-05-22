"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageSquare, Trash2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getLessonComments,
  addLessonComment,
  deleteLessonComment,
  type CommentRow,
  type AddCommentState,
} from "@/app/actions/lesson-comments";
import type { LessonRow } from "@/lib/queries/modules";

type Props = {
  lesson: LessonRow;
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const roleBadge: Record<string, string> = {
  superadmin: "bg-red-50 text-red-600",
  admin: "bg-violet-50 text-violet-600",
  docente: "bg-blue-50 text-blue-600",
  alumno: "bg-green-50 text-green-600",
  colaborador: "bg-amber-50 text-amber-600",
};

const roleLabel: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  docente: "Docente",
  alumno: "Alumno",
  colaborador: "Colaborador",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function LessonCommentsDialog({ lesson, courseId, open, onOpenChange }: Props) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletePending, startDelete] = useTransition();

  const [state, action, pending] = useActionState<AddCommentState, FormData>(
    addLessonComment,
    undefined
  );

  // Fetch comments when dialog opens
  useEffect(() => {
    if (open && lesson) {
      setLoading(true);
      getLessonComments(lesson.id)
        .then(setComments)
        .finally(() => setLoading(false));
    }
  }, [open, lesson]);

  // Refresh after successful add
  useEffect(() => {
    if (state?.success && lesson) {
      getLessonComments(lesson.id).then(setComments);
    }
    if (state?.message) {
      toast.error(state.message);
    }
  }, [state, lesson]);

  function handleDelete(id: string) {
    startDelete(async () => {
      const result = await deleteLessonComment(id, courseId);
      if (result?.success) {
        toast.success("Comentario eliminado.");
        setComments((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast.error(result?.message ?? "Error al eliminar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            Comentarios — {lesson.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">
          {/* Lista de comentarios */}
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {loading ? (
              <p className="text-xs text-[var(--color-neutral-400)] text-center py-6">
                Cargando comentarios...
              </p>
            ) : comments.length === 0 ? (
              <div className="py-8 text-center">
                <MessageSquare className="size-7 text-[var(--color-neutral-300)] mx-auto mb-2" />
                <p className="text-sm font-medium text-[var(--color-neutral-600)]">
                  Sin comentarios todavía
                </p>
                <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">
                  Sé el primero en comentar esta lección.
                </p>
              </div>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="flex gap-3 p-3 rounded-lg bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)]"
                >
                  {/* Avatar */}
                  <span className="shrink-0 flex items-center justify-center size-8 rounded-full bg-[var(--color-neutral-200)] text-sm font-semibold text-[var(--color-neutral-600)] self-start">
                    {c.author_name.charAt(0).toUpperCase()}
                  </span>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--color-neutral-800)]">
                        {c.author_name}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          roleBadge[c.author_role] ?? "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {roleLabel[c.author_role] ?? c.author_role}
                      </span>
                      <span className="text-xs text-[var(--color-neutral-400)] ml-auto">
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-neutral-700)] mt-1 leading-relaxed">
                      {c.body}
                    </p>
                  </div>

                  {/* Eliminar */}
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletePending}
                    className="shrink-0 p-1 rounded-md text-[var(--color-neutral-300)] hover:text-red-500 hover:bg-red-50 transition-colors self-start"
                    title="Eliminar comentario"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Formulario nuevo comentario */}
          <form action={action} className="flex flex-col gap-2 border-t pt-3">
            <input type="hidden" name="lesson_id" value={lesson.id} />
            <input type="hidden" name="course_id" value={courseId} />
            <textarea
              name="body"
              rows={2}
              placeholder="Escribe un comentario..."
              disabled={pending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 resize-none"
            />
            {state?.errors?.body && (
              <p className="text-xs text-red-500">{state.errors.body[0]}</p>
            )}
            <Button type="submit" disabled={pending} size="sm" className="text-white self-end">
              <Send className="size-3.5 mr-1.5" />
              {pending ? "Publicando..." : "Publicar"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

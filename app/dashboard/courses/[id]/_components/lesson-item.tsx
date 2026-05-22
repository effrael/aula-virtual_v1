"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { PlayCircle, Link2, ClipboardList, MoreHorizontal, Pencil, Trash2, Paperclip, FileUp, MessageSquare, ListChecks, BarChart2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteLesson } from "@/app/actions/modules";
import type { LessonRow } from "@/lib/queries/modules";

type Props = {
  lesson: LessonRow;
  courseId: string;
  onEdit: () => void;
  onResources: () => void;
  onSubmissions: () => void;
  onComments: () => void;
  onQuizEditor: () => void;
  onQuizAttempts: () => void;
};

const typeConfig = {
  video: {
    icon: PlayCircle,
    label: "Video",
    badge: "bg-violet-50 text-violet-600",
  },
  link: {
    icon: Link2,
    label: "Enlace",
    badge: "bg-blue-50 text-blue-600",
  },
  quiz: {
    icon: ClipboardList,
    label: "Quiz",
    badge: "bg-orange-50 text-orange-600",
  },
};

export function LessonItem({ lesson, courseId, onEdit, onResources, onSubmissions, onComments, onQuizEditor, onQuizAttempts }: Props) {
  const [pending, startTransition] = useTransition();
  const config = typeConfig[lesson.type];
  const Icon = config.icon;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLesson(lesson.id, courseId);
      if (result?.success) {
        toast.success("Lección eliminada.");
      } else {
        toast.error(result?.message ?? "Error al eliminar la lección.");
      }
    });
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-t border-[var(--color-neutral-100)] first:border-t-0 ${
        pending ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {/* Ícono de tipo */}
      <span className="shrink-0 flex items-center justify-center size-7 rounded-md bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)]">
        <Icon className="size-3.5 text-[var(--color-neutral-400)]" />
      </span>

      {/* Título y descripción */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-neutral-800)] truncate">
          {lesson.title}
        </p>
        {lesson.description && (
          <p className="text-xs text-[var(--color-neutral-400)] truncate mt-0.5">
            {lesson.description}
          </p>
        )}
      </div>

      {/* Badge de tipo */}
      <span
        className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${config.badge}`}
      >
        {config.label}
      </span>

      {/* Acciones */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="shrink-0 p-1 rounded-md hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-400)]">
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="size-3.5 mr-2" />
            Editar
          </DropdownMenuItem>
          {lesson.type !== "quiz" && (
            <DropdownMenuItem onClick={onResources}>
              <Paperclip className="size-3.5 mr-2" />
              Recursos
            </DropdownMenuItem>
          )}
          {lesson.type === "link" && (
            <DropdownMenuItem onClick={onSubmissions}>
              <FileUp className="size-3.5 mr-2" />
              Ver entregas
            </DropdownMenuItem>
          )}
          {lesson.type !== "quiz" && (
            <DropdownMenuItem onClick={onComments}>
              <MessageSquare className="size-3.5 mr-2" />
              Comentarios
            </DropdownMenuItem>
          )}
          {lesson.type === "quiz" && (
            <DropdownMenuItem onClick={onQuizEditor}>
              <ListChecks className="size-3.5 mr-2" />
              Gestionar preguntas
            </DropdownMenuItem>
          )}
          {lesson.type === "quiz" && (
            <DropdownMenuItem onClick={onQuizAttempts}>
              <BarChart2 className="size-3.5 mr-2" />
              Ver intentos
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={handleDelete}
          >
            <Trash2 className="size-3.5 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

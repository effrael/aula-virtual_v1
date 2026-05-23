"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  Plus,
  MoreHorizontal,
  Pencil,
  BookOpen,
  EyeOff,
  Eye,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleModuleStatus } from "@/app/actions/modules";
import { LessonItem } from "./lesson-item";
import type { ModuleRow, LessonRow } from "@/lib/queries/modules";

type Props = {
  module: ModuleRow;
  index: number;
  courseId: string;
  canEdit?: boolean;
  onEdit: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: LessonRow) => void;
  onLessonResources: (lesson: LessonRow) => void;
  onLessonSubmissions: (lesson: LessonRow) => void;
  onLessonComments: (lesson: LessonRow) => void;
  onLessonQuizEditor: (lesson: LessonRow) => void;
  onLessonQuizAttempts: (lesson: LessonRow) => void;
};

export function ModuleItem({
  module,
  index,
  courseId,
  canEdit = true,
  onEdit,
  onAddLesson,
  onEditLesson,
  onLessonResources,
  onLessonSubmissions,
  onLessonComments,
  onLessonQuizEditor,
  onLessonQuizAttempts,
}: Props) {
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();

  function handleToggleStatus() {
    startTransition(async () => {
      const next = !module.is_active;
      const result = await toggleModuleStatus(module.id, courseId, next);
      if (result?.success) {
        toast.success(next ? "Módulo activado." : "Módulo desactivado.");
      } else {
        toast.error(result?.message ?? "Error al cambiar el estado.");
      }
    });
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={`rounded-xl border border-[var(--color-neutral-200)] bg-white overflow-hidden ${
        pending ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {/* Cabecera del módulo */}
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--color-neutral-200)] ${
          module.is_active ? "bg-primary" : "bg-[var(--color-neutral-400)]"
        }`}
      >
        {/* Número y título */}
        <span
          className={`shrink-0 flex items-center justify-center size-6 rounded-full bg-white text-xs font-bold ${
            module.is_active ? "text-primary" : "text-[var(--color-neutral-400)]"
          }`}
        >
          {index + 1}
        </span>

        <p className="flex-1 text-sm font-semibold text-white truncate">
          {module.title}
        </p>

        {!module.is_active && (
          <span className="shrink-0 flex items-center gap-1 text-xs font-medium bg-white/20 text-white px-2 py-0.5 rounded-full">
            <EyeOff className="size-3" />
            Inactivo
          </span>
        )}

        <span className="shrink-0 text-xs text-[var(--color-neutral-100)]">
          {module.lessons.length}{" "}
          {module.lessons.length === 1 ? "lección" : "lecciones"}
        </span>

        {/* Acciones del módulo */}
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="shrink-0 p-1 rounded-md hover:bg-white/20 text-white/70 hover:text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="size-3.5 mr-2" />
                Editar módulo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleStatus}>
                {module.is_active ? (
                  <>
                    <EyeOff className="size-3.5 mr-2" />
                    Desactivar módulo
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5 mr-2" />
                    Activar módulo
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Colapsar/expandir */}
        <CollapsibleTrigger asChild>
          <button className="shrink-0 p-1 rounded-md hover:bg-[var(--color-neutral-200)] text-[var(--color-neutral-400)]">
            <ChevronDown
              className={`size-4 transition-transform duration-200 ${
                open ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
        </CollapsibleTrigger>
      </div>

      {/* Contenido colapsable */}
      <CollapsibleContent>
        {module.lessons.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-8 text-center">
            <BookOpen className="size-6 text-[var(--color-neutral-300)]" />
            <p className="text-xs text-[var(--color-neutral-400)]">
              Sin lecciones. Agrega la primera.
            </p>
          </div>
        ) : (
          <div>
            {module.lessons.map((lesson) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                courseId={courseId}
                onEdit={() => onEditLesson(lesson)}
                onResources={() => onLessonResources(lesson)}
                onSubmissions={() => onLessonSubmissions(lesson)}
                onComments={() => onLessonComments(lesson)}
                onQuizEditor={() => onLessonQuizEditor(lesson)}
                onQuizAttempts={() => onLessonQuizAttempts(lesson)}
              />
            ))}
          </div>
        )}

        {/* Botón agregar lección */}
        {canEdit && (
          <div className="px-4 py-3 border-t border-[var(--color-neutral-100)]">
            <button
              onClick={onAddLesson}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] transition-colors"
            >
              <Plus className="size-3.5" />
              Agregar lección
            </button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

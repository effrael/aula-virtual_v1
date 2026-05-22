"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleItem } from "./module-item";
import { CreateModuleDialog } from "./create-module-dialog";
import { EditModuleDialog } from "./edit-module-dialog";
import { CreateLessonDialog } from "./create-lesson-dialog";
import { EditLessonDialog } from "./edit-lesson-dialog";
import type { ModuleRow, LessonRow } from "@/lib/queries/modules";
import type { VideoRow } from "@/lib/queries/videos";
import type { StorageFile } from "@/lib/storage-utils";

// Cargados dinámicamente (ssr:false) para evitar que Turbopack procese sus
// server action imports durante la generación del RSC payload del servidor.
const LessonResourcesDialog = dynamic(
  () => import("./lesson-resources-dialog").then((m) => m.LessonResourcesDialog),
  { ssr: false }
);
const LessonSubmissionsDialog = dynamic(
  () => import("./lesson-submissions-dialog").then((m) => m.LessonSubmissionsDialog),
  { ssr: false }
);
const LessonCommentsDialog = dynamic(
  () => import("./lesson-comments-dialog").then((m) => m.LessonCommentsDialog),
  { ssr: false }
);
const QuizEditorDialog = dynamic(
  () => import("./quiz-editor-dialog").then((m) => m.QuizEditorDialog),
  { ssr: false }
);
const QuizAttemptsDialog = dynamic(
  () => import("./quiz-attempts-dialog").then((m) => m.QuizAttemptsDialog),
  { ssr: false }
);

type Props = {
  courseId: string;
  modules: ModuleRow[];
  videos: VideoRow[];
  libraryFiles: StorageFile[];
};

export function ModuleList({ courseId, modules, videos }: Props) {
  // ── Dialog state ───────────────────────────────────────────────────────────
  const [createModuleOpen, setCreateModuleOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleRow | null>(null);
  const [createLessonModuleId, setCreateLessonModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonRow | null>(null);
  const [resourcesLesson, setResourcesLesson] = useState<LessonRow | null>(null);
  const [submissionsLesson, setSubmissionsLesson] = useState<LessonRow | null>(null);
  const [commentsLesson, setCommentsLesson] = useState<LessonRow | null>(null);
  const [quizEditorLesson, setQuizEditorLesson] = useState<LessonRow | null>(null);
  const [quizAttemptsLesson, setQuizAttemptsLesson] = useState<LessonRow | null>(null);

  return (
    <>
      {/* Lista de módulos */}
      <div className="flex flex-col gap-3">
        {modules.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center border border-dashed rounded-xl bg-white">
            <LayoutList className="size-8 text-[var(--color-neutral-300)]" />
            <div>
              <p className="text-sm font-medium text-[var(--color-neutral-700)]">
                Sin módulos todavía
              </p>
              <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">
                Agrega el primer módulo para organizar las lecciones del curso.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateModuleOpen(true)}
            >
              <Plus className="size-4 mr-1.5" />
              Agregar módulo
            </Button>
          </div>
        ) : (
          <>
            {modules.map((mod, index) => (
              <ModuleItem
                key={mod.id}
                module={mod}
                index={index}
                courseId={courseId}
                onEdit={() => setEditingModule(mod)}
                onAddLesson={() => setCreateLessonModuleId(mod.id)}
                onEditLesson={(lesson) => setEditingLesson(lesson)}
                onLessonResources={(lesson) => setResourcesLesson(lesson)}
                onLessonSubmissions={(lesson) => setSubmissionsLesson(lesson)}
                onLessonComments={(lesson) => setCommentsLesson(lesson)}
                onLessonQuizEditor={(lesson) => setQuizEditorLesson(lesson)}
                onLessonQuizAttempts={(lesson) => setQuizAttemptsLesson(lesson)}
              />
            ))}

            <Button
              variant="outline"
              className="w-full border-dashed text-[var(--color-neutral-500)]"
              onClick={() => setCreateModuleOpen(true)}
            >
              <Plus className="size-4 mr-1.5" />
              Agregar módulo
            </Button>
          </>
        )}
      </div>

      {/* Dialogs — montados fuera del árbol de módulos para evitar re-renders */}
      <CreateModuleDialog
        key={`create-module-${createModuleOpen}`}
        courseId={courseId}
        open={createModuleOpen}
        onOpenChange={setCreateModuleOpen}
      />

      <EditModuleDialog
        key={`edit-module-${editingModule?.id ?? "none"}`}
        module={editingModule}
        courseId={courseId}
        open={!!editingModule}
        onOpenChange={(open) => {
          if (!open) setEditingModule(null);
        }}
      />

      <CreateLessonDialog
        key={`create-lesson-${createLessonModuleId ?? "none"}`}
        moduleId={createLessonModuleId ?? ""}
        courseId={courseId}
        videos={videos}
        open={!!createLessonModuleId}
        onOpenChange={(open) => {
          if (!open) setCreateLessonModuleId(null);
        }}
      />

      <EditLessonDialog
        key={`edit-lesson-${editingLesson?.id ?? "none"}`}
        lesson={editingLesson}
        courseId={courseId}
        videos={videos}
        open={!!editingLesson}
        onOpenChange={(open) => {
          if (!open) setEditingLesson(null);
        }}
      />

      {resourcesLesson && (
        <LessonResourcesDialog
          lesson={resourcesLesson}
          courseId={courseId}
          open
          onOpenChange={(open) => {
            if (!open) setResourcesLesson(null);
          }}
        />
      )}

      {submissionsLesson && (
        <LessonSubmissionsDialog
          lesson={submissionsLesson}
          open
          onOpenChange={(open) => {
            if (!open) setSubmissionsLesson(null);
          }}
        />
      )}

      {commentsLesson && (
        <LessonCommentsDialog
          lesson={commentsLesson}
          courseId={courseId}
          open
          onOpenChange={(open) => {
            if (!open) setCommentsLesson(null);
          }}
        />
      )}

      {quizEditorLesson && (
        <QuizEditorDialog
          lesson={quizEditorLesson}
          courseId={courseId}
          open
          onOpenChange={(open) => {
            if (!open) setQuizEditorLesson(null);
          }}
        />
      )}

      {quizAttemptsLesson && (
        <QuizAttemptsDialog
          lesson={quizAttemptsLesson}
          open
          onOpenChange={(open) => {
            if (!open) setQuizAttemptsLesson(null);
          }}
        />
      )}
    </>
  );
}

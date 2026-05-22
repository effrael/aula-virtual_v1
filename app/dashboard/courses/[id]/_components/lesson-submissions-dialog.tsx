"use client";

import { useEffect, useState } from "react";
import { FileUp, FileText, ImageIcon, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLessonSubmissions, type SubmissionRow } from "@/app/actions/lesson-submissions";
import { getFileCategory } from "@/lib/storage-utils";
import type { LessonRow } from "@/lib/queries/modules";

type Props = {
  lesson: LessonRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function FileIcon({ mimetype }: { mimetype: string }) {
  const cat = getFileCategory(mimetype);
  if (cat === "image") return <ImageIcon className="size-4" />;
  return <FileText className="size-4" />;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function LessonSubmissionsDialog({ lesson, open, onOpenChange }: Props) {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && lesson) {
      setLoading(true);
      getLessonSubmissions(lesson.id)
        .then(setSubmissions)
        .finally(() => setLoading(false));
    }
  }, [open, lesson]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-4" />
            Entregas — {lesson.title}
          </DialogTitle>
        </DialogHeader>

        <div className="pt-1">
          {loading ? (
            <div className="py-10 text-center text-xs text-[var(--color-neutral-400)]">
              Cargando entregas...
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-10 text-center">
              <FileUp className="size-8 text-[var(--color-neutral-300)] mx-auto mb-2" />
              <p className="text-sm font-medium text-[var(--color-neutral-600)]">
                Sin entregas todavía
              </p>
              <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">
                Los alumnos aún no han subido comprobantes para esta lección.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-[var(--color-neutral-500)] mb-2">
                {submissions.length} {submissions.length === 1 ? "entrega" : "entregas"}
              </p>
              <div className="flex flex-col divide-y border rounded-xl overflow-hidden">
                {submissions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    {/* Avatar inicial */}
                    <span className="shrink-0 flex items-center justify-center size-8 rounded-full bg-[var(--color-neutral-100)] text-sm font-semibold text-[var(--color-neutral-600)]">
                      {s.student_name.charAt(0).toUpperCase()}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-neutral-800)]">
                        {s.student_name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[var(--color-neutral-400)]">
                          <FileIcon mimetype={s.mimetype} />
                        </span>
                        <span className="text-xs text-[var(--color-neutral-400)] truncate">
                          {s.file_name}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">
                        {formatDate(s.created_at)}
                      </p>
                    </div>

                    {/* Link de descarga */}
                    <a
                      href={s.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1.5 rounded-md text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-900)] hover:bg-[var(--color-neutral-100)] transition-colors"
                      title="Ver archivo"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

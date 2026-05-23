"use client";

import { useEffect, useState } from "react";
import { Loader2, Paperclip, FileText, FileSpreadsheet, Archive, File, ImageIcon, Download } from "lucide-react";
import { getLessonResources, type ResourceRow } from "@/app/actions/lesson-resources";
import { getFileCategory } from "@/lib/storage-utils";
import { formatBytes } from "@/lib/utils";

function ResourceIcon({ mimetype }: { mimetype: string }) {
  const cat = getFileCategory(mimetype);
  if (cat === "image")             return <ImageIcon className="size-4" />;
  if (cat === "pdf" || cat === "word") return <FileText className="size-4" />;
  if (cat === "excel")             return <FileSpreadsheet className="size-4" />;
  if (cat === "zip")               return <Archive className="size-4" />;
  return <File className="size-4" />;
}

export function ResourcesTab({ lessonId }: { lessonId: string }) {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    getLessonResources(lessonId)
      .then(setResources)
      .finally(() => setLoading(false));
  }, [lessonId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 text-[var(--color-neutral-300)] animate-spin" />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Paperclip className="size-6 text-[var(--color-neutral-300)]" />
        <p className="text-sm text-[var(--color-neutral-400)]">No hay recursos para esta lección.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y border border-[var(--color-neutral-200)] rounded-xl overflow-hidden">
      {resources.map((r) => (
        <div key={r.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-[var(--color-neutral-50)] transition-colors">
          <span className="shrink-0 text-[var(--color-neutral-400)]">
            <ResourceIcon mimetype={r.mimetype} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-neutral-800)] truncate">{r.name}</p>
            {r.file_size && (
              <p className="text-xs text-[var(--color-neutral-400)]">{formatBytes(r.file_size)}</p>
            )}
          </div>
          <a
            href={r.file_url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="shrink-0 p-1.5 rounded-md text-[var(--color-neutral-400)] hover:text-primary hover:bg-primary/8 transition-colors"
            title="Descargar"
          >
            <Download className="size-4" />
          </a>
        </div>
      ))}
    </div>
  );
}

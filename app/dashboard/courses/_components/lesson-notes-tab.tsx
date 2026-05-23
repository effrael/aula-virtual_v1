"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, NotebookPen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getLessonNote, saveLessonNote } from "@/app/actions/lesson-notes";

type SaveStatus = "idle" | "saving" | "saved";

export function NotesTab({ lessonId }: { lessonId: string }) {
  const [body, setBody]         = useState("");
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(false);
  const [status, setStatus]     = useState<SaveStatus>("idle");
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef            = useRef("");

  useEffect(() => {
    setLoading(true);
    setStatus("idle");
    setEditing(false);
    getLessonNote(lessonId)
      .then((text) => {
        setBody(text);
        lastSavedRef.current = text;
        if (text) setEditing(true);
      })
      .finally(() => setLoading(false));
  }, [lessonId]);

  function handleChange(value: string) {
    setBody(value);
    setStatus("idle");

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (value === lastSavedRef.current) return;
      setStatus("saving");
      const result = await saveLessonNote(lessonId, value);
      if (result.success) {
        lastSavedRef.current = value;
        setStatus("saved");
      } else {
        setStatus("idle");
      }
    }, 1000);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 text-[var(--color-neutral-300)] animate-spin" />
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center rounded-xl border border-dashed border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]">
        <span className="flex items-center justify-center size-12 rounded-full bg-white border border-[var(--color-neutral-200)] shadow-sm">
          <NotebookPen className="size-5 text-[var(--color-neutral-400)]" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--color-neutral-700)]">Sin notas todavía</p>
          <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">Solo tú puedes ver tus apuntes</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <NotebookPen className="size-3.5" />
          Agregar notas
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-neutral-400)]">
          <NotebookPen className="size-3.5" />
          <span>Solo tú puedes ver estas notas</span>
        </div>
        <span className={`text-xs transition-opacity duration-300 flex items-center gap-1 ${
          status === "idle" ? "opacity-0" : "opacity-100"
        }`}>
          {status === "saving" && (
            <><Loader2 className="size-3 animate-spin text-[var(--color-neutral-400)]" /><span className="text-[var(--color-neutral-400)]">Guardando…</span></>
          )}
          {status === "saved" && (
            <><Check className="size-3 text-green-500" /><span className="text-green-600">Guardado</span></>
          )}
        </span>
      </div>

      <Textarea
        value={body}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Escribe tus apuntes aquí…"
        rows={10}
        autoFocus
        className="resize-y bg-white leading-relaxed"
      />
    </div>
  );
}

"use client";

import { useRef, useState, useEffect } from "react";
import { Bold, Italic, List, ListOrdered, Link2, Unlink } from "lucide-react";

type Props = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function RichTextEditor({ name, defaultValue = "", placeholder, disabled }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(defaultValue);
  const [isEmpty, setIsEmpty] = useState(!defaultValue);

  useEffect(() => {
    if (editorRef.current && defaultValue) {
      editorRef.current.innerHTML = defaultValue;
      setIsEmpty(false);
    }
  }, []); // Solo en mount

  function handleInput() {
    const html = editorRef.current?.innerHTML ?? "";
    const text = editorRef.current?.textContent?.trim() ?? "";
    setContent(html);
    setIsEmpty(!text);
  }

  function execCmd(cmd: string, value?: string) {
    if (disabled) return;
    document.execCommand(cmd, false, value ?? undefined);
    editorRef.current?.focus();
    handleInput();
  }

  function handleLink() {
    if (disabled) return;
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().length > 0;
    if (!hasSelection) return;
    const url = prompt("URL del enlace (ej. https://ejemplo.com):");
    if (url) execCmd("createLink", url);
  }

  function handleUnlink() {
    if (disabled) return;
    execCmd("unlink");
  }

  const toolbarBtn =
    "p-1.5 rounded hover:bg-[var(--color-neutral-200)] text-[var(--color-neutral-600)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

  return (
    <div
      className={`border border-[var(--color-neutral-200)] rounded-md overflow-hidden bg-white ${
        disabled ? "opacity-60" : ""
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]">
        <button type="button" onClick={() => execCmd("bold")} disabled={disabled} title="Negrita (Ctrl+B)" className={toolbarBtn}>
          <Bold className="size-3.5" />
        </button>
        <button type="button" onClick={() => execCmd("italic")} disabled={disabled} title="Cursiva (Ctrl+I)" className={toolbarBtn}>
          <Italic className="size-3.5" />
        </button>

        <div className="w-px h-4 bg-[var(--color-neutral-200)] mx-1" />

        <button type="button" onClick={() => execCmd("insertUnorderedList")} disabled={disabled} title="Lista con viñetas" className={toolbarBtn}>
          <List className="size-3.5" />
        </button>
        <button type="button" onClick={() => execCmd("insertOrderedList")} disabled={disabled} title="Lista numerada" className={toolbarBtn}>
          <ListOrdered className="size-3.5" />
        </button>

        <div className="w-px h-4 bg-[var(--color-neutral-200)] mx-1" />

        <button type="button" onClick={handleLink} disabled={disabled} title="Insertar enlace (selecciona texto primero)" className={toolbarBtn}>
          <Link2 className="size-3.5" />
        </button>
        <button type="button" onClick={handleUnlink} disabled={disabled} title="Quitar enlace" className={toolbarBtn}>
          <Unlink className="size-3.5" />
        </button>
      </div>

      {/* Área de edición */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleInput}
          className="min-h-[140px] max-h-[320px] overflow-y-auto px-3 py-2.5 text-sm text-[var(--color-neutral-900)] outline-none
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
            [&_li]:my-0.5
            [&_a]:text-blue-600 [&_a]:underline
            [&_b]:font-semibold [&_strong]:font-semibold
            [&_i]:italic [&_em]:italic"
        />
        {isEmpty && placeholder && (
          <div className="absolute top-2.5 left-3 text-sm text-[var(--color-neutral-400)] pointer-events-none select-none">
            {placeholder}
          </div>
        )}
      </div>

      {/* Hidden input sincronizado para el form */}
      <input type="hidden" name={name} value={content} onChange={() => {}} />
    </div>
  );
}

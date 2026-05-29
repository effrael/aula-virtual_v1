"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, Download, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importUsers, type ImportResult } from "@/app/actions/users";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as XLSX from "xlsx"; // usado solo para downloadTemplate

function downloadTemplate() {
  const rows = [
    { nombre: "Juan",   apellidos: "García López",  email: "juan@escuela.com",   password: "Pass1234!", role: "alumno",      dni: "12345678"  },
    { nombre: "María",  apellidos: "López Ríos",    email: "maria@escuela.com",  password: "Pass1234!", role: "docente",     dni: "87654321"  },
    { nombre: "Carlos", apellidos: "Ruiz Torres",   email: "carlos@escuela.com", password: "Pass1234!", role: "colaborador", dni: "11223344"  },
  ];
  const ws = XLSX.utils.json_to_sheet(rows, { header: ["nombre", "apellidos", "email", "password", "role", "dni"] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
  XLSX.writeFile(wb, "plantilla_usuarios.xlsx");
}

export function ImportUsersModal() {
  const [open, setOpen]         = useState(false);
  const [file, setFile]         = useState<File | null>(null);
  const [result, setResult]     = useState<ImportResult | null>(null);
  const [pending, startImport]  = useTransition();
  const inputRef                = useRef<HTMLInputElement>(null);
  const router                  = useRouter();

  function reset() {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose(val: boolean) {
    if (!val) reset();
    setOpen(val);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".csv")) {
      toast.error("Solo se aceptan archivos .csv");
      return;
    }
    setFile(f);
    setResult(null);
  }

  function handleSubmit() {
    if (!file) return;
    startImport(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await importUsers(fd);
      if (res.message && !res.success) {
        toast.error(res.message);
        return;
      }
      if (res.result) {
        setResult(res.result);
        if (res.result.created > 0) router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Upload className="size-4" />
          Importar CSV
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar usuarios</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-1">
          {/* Paso 1: descargar plantilla */}
          <div className="rounded-lg border border-[var(--color-neutral-200)] p-4 flex items-start gap-3">
            <div className="size-8 rounded-md bg-[var(--color-neutral-100)] flex items-center justify-center shrink-0">
              <Download className="size-4 text-[var(--color-neutral-500)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-neutral-900)]">
                1. Descarga la plantilla
              </p>
              <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
                Columnas: <code className="bg-[var(--color-neutral-100)] px-1 rounded text-xs">nombre, apellidos, email, password, role, dni</code>
                <br />
                Roles válidos: <code className="bg-[var(--color-neutral-100)] px-1 rounded text-xs">alumno</code>{" "}
                <code className="bg-[var(--color-neutral-100)] px-1 rounded text-xs">docente</code>{" "}
                <code className="bg-[var(--color-neutral-100)] px-1 rounded text-xs">colaborador</code>
              </p>
              <button
                onClick={downloadTemplate}
                className="mt-2 text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                Descargar plantilla_usuarios.xlsx →
              </button>
            </div>
          </div>

          {/* Paso 2: subir archivo */}
          {!result && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-[var(--color-neutral-700)]">
                2. Sube tu archivo
              </p>

              <label className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
                file
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                  : "border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-400)]"
              }`}>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFile}
                />
                {file ? (
                  <>
                    <CheckCircle2 className="size-6 text-[var(--color-primary)]" />
                    <p className="text-sm font-medium text-[var(--color-neutral-900)]">{file.name}</p>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); reset(); }}
                      className="text-xs text-[var(--color-neutral-500)] hover:text-red-500 flex items-center gap-1"
                    >
                      <X className="size-3" /> Quitar archivo
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="size-6 text-[var(--color-neutral-400)]" />
                    <p className="text-sm text-[var(--color-neutral-500)]">
                      Haz clic o arrastra tu archivo <span className="font-medium">.csv</span>
                    </p>
                  </>
                )}
              </label>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={!file || pending}>
                  {pending ? (
                    <><Loader2 className="size-3.5 animate-spin" /> Importando...</>
                  ) : (
                    "Importar"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="flex flex-col gap-3">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-[var(--color-neutral-200)] p-3 text-center">
                  <p className="text-2xl font-bold text-[var(--color-neutral-900)]">{result.total}</p>
                  <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">Total</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{result.created}</p>
                  <p className="text-xs text-green-600 mt-0.5">Creados</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{result.failed.length}</p>
                  <p className="text-xs text-red-600 mt-0.5">Fallidos</p>
                </div>
              </div>

              {/* Errores */}
              {result.failed.length > 0 && (
                <div className="rounded-lg border border-[var(--color-neutral-200)] overflow-hidden">
                  <div className="px-3 py-2 bg-[var(--color-neutral-50)] border-b border-[var(--color-neutral-100)] flex items-center justify-between">
                    <p className="text-xs font-medium text-[var(--color-neutral-700)]">
                      Filas con error
                    </p>
                    <button
                      onClick={() => {
                        const content = result.failed
                          .map((f) => `Fila ${f.row} | ${f.email} | ${f.reason}`)
                          .join("\n");
                        const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
                        const url  = URL.createObjectURL(blob);
                        const a    = document.createElement("a");
                        a.href     = url;
                        a.download = "errores_importacion.txt";
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="text-xs font-medium text-[var(--color-primary)] hover:underline flex items-center gap-1"
                    >
                      <Download className="size-3" />
                      Exportar errores
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-[var(--color-neutral-100)]">
                    {result.failed.map((f) => (
                      <div key={`${f.row}-${f.email}`} className="flex items-start gap-2 px-3 py-2">
                        <AlertCircle className="size-3.5 text-red-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--color-neutral-800)]">
                            Fila {f.row} — {f.email}
                          </p>
                          <p className="text-xs text-[var(--color-neutral-500)]">{f.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={reset}>
                  Importar otro
                </Button>
                <Button onClick={() => handleClose(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

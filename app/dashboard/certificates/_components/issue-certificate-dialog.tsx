"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Award, AlertCircle, Eye, Loader2,
  ChevronsUpDown, Check, Upload, FileText, Download, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  generateCertificate, previewCertificate, generateCertificateBatch,
  generateCertificateExternal,
  type BatchRow, type BatchResult, type ExternalCertificateInput,
} from "@/app/actions/certificates";

type Student = { id: string; full_name: string; apellidos: string | null };
type Course  = { id: string; title: string };
type TemplateField = { name: string; defaultValue: string };
type Template = {
  id: string; name: string; hasDesign: boolean;
  fieldNames: string[]; customFields: TemplateField[];
};

type Props = { students: Student[]; courses: Course[]; templates: Template[] };

// ── helpers ──────────────────────────────────────────────────────────────────

function studentLabel(s: Student) {
  const ap = s.apellidos?.trim();
  return ap ? `${ap}, ${s.full_name.replace(ap, "").trim()}` : s.full_name;
}

function getNombre(s: Student) {
  const ap = s.apellidos?.trim();
  return ap ? s.full_name.replace(ap, "").trim() : s.full_name;
}

function ComboBox<T extends { id: string }>({
  items, value, onChange, open, setOpen, placeholder, renderItem, renderSelected, renderRow,
}: {
  items: T[]; value: string; onChange: (id: string) => void;
  open: boolean; setOpen: (v: boolean) => void;
  placeholder: string;
  renderItem: (item: T) => string;         // value for search
  renderSelected: (item: T) => React.ReactNode;
  renderRow: (item: T) => React.ReactNode;
}) {
  const selected = items.find((i) => i.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-auto min-h-9">
          {selected ? <span className="truncate text-left">{renderSelected(selected)}</span> : <span className="text-[var(--color-neutral-400)]">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command>
          <CommandInput placeholder={`Buscar...`} />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem key={item.id} value={renderItem(item)} onSelect={() => { onChange(item.id); setOpen(false); }}>
                  <Check className={cn("mr-2 size-4 shrink-0", value === item.id ? "opacity-100" : "opacity-0")} />
                  {renderRow(item)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function IssueCertificateDialog({ students, courses, templates }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleClose() { setOpen(false); }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-[var(--color-neutral-200)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)] shrink-0">
          <Award className="size-4 mr-1.5" />
          Emitir certificado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emitir certificado</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="manual">
          <TabsList className="w-full">
            <TabsTrigger value="manual"   className="flex-1">Manual</TabsTrigger>
            <TabsTrigger value="csv"      className="flex-1">Importar Excel</TabsTrigger>
            <TabsTrigger value="external" className="flex-1">Sin registro</TabsTrigger>
          </TabsList>
          <TabsContent value="manual">
            <ManualTab students={students} courses={courses} templates={templates} onClose={handleClose} onSuccess={() => { handleClose(); router.refresh(); }} />
          </TabsContent>
          <TabsContent value="csv">
            <CsvTab courses={courses} templates={templates} onSuccess={() => { handleClose(); router.refresh(); }} />
          </TabsContent>
          <TabsContent value="external">
            <ExternalTab templates={templates} courses={courses} onClose={handleClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Manual tab ────────────────────────────────────────────────────────────────

function ManualTab({ students, courses, templates, onClose, onSuccess }: Props & { onClose: () => void; onSuccess: () => void }) {
  const [templateId, setTemplateId] = useState("");
  const [studentId,  setStudentId]  = useState("");
  const [courseId,   setCourseId]   = useState("");
  const [overrides,  setOverrides]  = useState<Record<string, string>>({});
  const [loading,    setLoading]    = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const [openTpl, setOpenTpl] = useState(false);
  const [openStu, setOpenStu] = useState(false);
  const [openCou, setOpenCou] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const selectedStudent  = students.find((s)  => s.id === studentId);

  const customFields = useMemo(() => selectedTemplate?.customFields ?? [], [selectedTemplate]);

  // Pre-fill overrides when template or student changes
  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    const next: Record<string, string> = {};
    for (const f of tpl?.customFields ?? []) next[f.name] = f.defaultValue;
    setOverrides(next);
  }

  function handleStudentChange(id: string) {
    setStudentId(id);
    const s = students.find((st) => st.id === id);
    if (!s) return;
    setOverrides((prev) => ({
      ...prev,
      nombre:    getNombre(s),
      apellidos: s.apellidos?.trim() ?? "",
    }));
  }

  // Auto-fields to display + edit
  const autoFieldsToShow = [
    { key: "nombre",    label: "Nombre",    value: overrides["nombre"]    ?? (selectedStudent ? getNombre(selectedStudent) : "") },
    { key: "apellidos", label: "Apellidos", value: overrides["apellidos"] ?? (selectedStudent?.apellidos ?? "") },
    { key: "dni",       label: "DNI",       value: overrides["dni"]       ?? "" },
    { key: "codigo",    label: "Código",    value: overrides["codigo"]    ?? "", placeholder: "Dejar vacío para generar automático" },
  ];

  function setOverride(key: string, val: string) {
    setOverrides((prev) => ({ ...prev, [key]: val }));
  }

  // Build customInputs: overrides for non-auto + custom fields
  function buildCustomInputs(): Record<string, string> | undefined {
    const res: Record<string, string> = {};
    // Include editable auto-fields as overrides (except codigo/qr which are always auto)
    for (const f of ["nombre", "apellidos", "dni", "codigo"] as const) {
      if (overrides[f]) res[f] = overrides[f];
    }
    for (const f of customFields) {
      if (overrides[f.name] !== undefined) res[f.name] = overrides[f.name];
    }
    return Object.keys(res).length > 0 ? res : undefined;
  }

  async function handlePreview() {
    if (!templateId) { toast.error("Selecciona una plantilla."); return; }
    setPreviewing(true);
    const res = await previewCertificate(templateId, studentId || undefined, courseId || undefined, buildCustomInputs());
    setPreviewing(false);
    if (res.pdf) {
      const bytes = Uint8Array.from(atob(res.pdf), (c) => c.charCodeAt(0));
      window.open(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })), "_blank");
    } else {
      toast.error(res.message ?? "Error al generar vista previa.");
    }
  }

  async function handleSubmit() {
    if (!templateId || !studentId || !courseId) { toast.error("Completa plantilla, alumno y curso."); return; }
    const emptyCustom = customFields.filter((f) => !overrides[f.name]?.trim() && !f.defaultValue);
    if (emptyCustom.length > 0) { toast.error(`Completa: ${emptyCustom.map((f) => f.name).join(", ")}`); return; }

    setLoading(true);
    const res = await generateCertificate(studentId, courseId, null, templateId, buildCustomInputs());
    setLoading(false);

    if (res.certificateId) {
      res.pdfError ? toast.warning(`Registrado, pero PDF falló: ${res.pdfError}`) : toast.success("Certificado emitido.");
      onSuccess();
    } else {
      toast.error(res.message ?? "Error al emitir.");
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      {/* Template */}
      <Field label="Plantilla">
        {templates.length === 0 ? (
          <AlertBox>No hay plantillas creadas.</AlertBox>
        ) : (
          <ComboBox
            items={templates} value={templateId} onChange={handleTemplateChange}
            open={openTpl} setOpen={setOpenTpl} placeholder="Selecciona una plantilla..."
            renderItem={(t) => t.name}
            renderSelected={(t) => t.name}
            renderRow={(t) => <span>{t.name}{!t.hasDesign && <span className="ml-2 text-[10px] text-amber-600">sin diseño</span>}</span>}
          />
        )}
      </Field>

      {/* Alumno */}
      <Field label="Alumno">
        <ComboBox
          items={students} value={studentId} onChange={handleStudentChange}
          open={openStu} setOpen={setOpenStu} placeholder="Selecciona un alumno..."
          renderItem={studentLabel}
          renderSelected={(s) => (
            <span className="flex gap-1">
              {s.apellidos?.trim() && <span className="font-medium">{s.apellidos}</span>}
              {s.apellidos?.trim() && <span className="text-[var(--color-neutral-400)]">,</span>}
              <span>{getNombre(s)}</span>
            </span>
          )}
          renderRow={(s) => (
            <div className="flex flex-col">
              {s.apellidos?.trim() ? (
                <>
                  <span className="text-sm font-medium">{s.apellidos}</span>
                  <span className="text-xs text-[var(--color-neutral-400)]">{getNombre(s)}</span>
                </>
              ) : (
                <span className="text-sm">{s.full_name}</span>
              )}
            </div>
          )}
        />
      </Field>

      {/* Curso */}
      <Field label="Curso">
        <ComboBox
          items={courses} value={courseId} onChange={setCourseId}
          open={openCou} setOpen={setOpenCou} placeholder="Selecciona un curso..."
          renderItem={(c) => c.title}
          renderSelected={(c) => c.title}
          renderRow={(c) => <span className="text-sm">{c.title}</span>}
        />
      </Field>

      {/* Datos del certificado */}
      {selectedTemplate?.hasDesign && (
        <div className="rounded-lg border border-[var(--color-neutral-200)] overflow-hidden">
          <div className="px-4 py-2 bg-[var(--color-neutral-50)] border-b border-[var(--color-neutral-100)]">
            <p className="text-xs font-semibold text-[var(--color-neutral-700)]">Datos del certificado</p>
            <p className="text-[10px] text-[var(--color-neutral-400)]">Puedes editar los valores antes de emitir</p>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {autoFieldsToShow.map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <Label className="text-xs">{f.label}</Label>
                <Input
                  className="h-9 text-sm"
                  value={overrides[f.key] ?? f.value}
                  placeholder={(f as any).placeholder}
                  onChange={(e) => setOverride(f.key, e.target.value)}
                />
              </div>
            ))}
            {customFields.map((f) => (
              <div key={f.name} className="flex flex-col gap-1">
                <Label className="text-xs capitalize">{f.name}</Label>
                <Input
                  className="h-9 text-sm"
                  value={overrides[f.name] ?? ""}
                  onChange={(e) => setOverride(f.name, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between gap-2 pt-1">
        <Button variant="outline" onClick={handlePreview} disabled={previewing || !templateId} className="shrink-0">
          {previewing ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Eye className="size-4 mr-1.5" />}
          Vista previa
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !templateId || !studentId || !courseId} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white">
            {loading ? "Emitiendo..." : "Emitir certificado"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── CSV tab ───────────────────────────────────────────────────────────────────

function CsvTab({ courses, templates, onSuccess }: Pick<Props, "courses" | "templates"> & { onSuccess: () => void }) {
  const [templateId, setTemplateId] = useState("");
  const [courseId,   setCourseId]   = useState("");
  const [rows,       setRows]       = useState<BatchRow[]>([]);
  const [headers,    setHeaders]    = useState<string[]>([]);
  const [results,    setResults]    = useState<BatchResult[] | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [openTpl,    setOpenTpl]    = useState(false);
  const [openCou,    setOpenCou]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const templateCustomFields = selectedTemplate?.customFields.map((f) => f.name) ?? [];
  const allHeaders = ["apellidos", "nombre", "dni", "codigo", ...templateCustomFields];

  // ── download XLSX template ─────────────────────────────────────────────────
  async function handleDownloadTemplate() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      allHeaders,
      allHeaders.map(() => ""),   // empty sample row
    ]);

    // Column widths
    ws["!cols"] = allHeaders.map((h) => ({ wch: Math.max(h.length + 4, 14) }));

    // Style header row bold (xlsx community edition doesn't support styles deeply,
    // but we can at least set the header row freeze)
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Certificados");
    XLSX.writeFile(wb, "plantilla_certificados.xlsx");
  }

  // ── parse uploaded file (xlsx or csv) ─────────────────────────────────────
  function applyRows(hdrs: string[], data: string[][]) {
    if (!hdrs.includes("dni")) { toast.error("El archivo debe tener columna 'dni'."); return; }
    const parsed: BatchRow[] = data
      .map((vals) => {
        const row: BatchRow = { apellidos: "", nombre: "", dni: "" };
        hdrs.forEach((h, i) => { row[h] = vals[i]?.trim() ?? ""; });
        return row;
      })
      .filter((r) => r.dni?.trim());
    if (parsed.length === 0) { toast.error("No se encontraron filas con DNI."); return; }
    setHeaders(hdrs);
    setRows(parsed);
    setResults(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".csv")) {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) { toast.error("El CSV debe tener encabezado y al menos una fila."); return; }
      const hdrs = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const data = lines.slice(1).map((l) => l.split(","));
      applyRows(hdrs, data);
    } else {
      const XLSX = await import("xlsx");
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type: "array" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const raw  = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
      if (raw.length < 2) { toast.error("El archivo debe tener encabezado y al menos una fila."); return; }
      const hdrs = raw[0].map((h) => String(h).trim().toLowerCase());
      applyRows(hdrs, raw.slice(1) as string[][]);
    }

    // reset input so same file can be re-selected
    e.target.value = "";
  }

  async function handleEmitAll() {
    if (!templateId || !courseId) { toast.error("Selecciona plantilla y curso."); return; }
    if (rows.length === 0) { toast.error("No hay filas para emitir."); return; }
    setLoading(true);
    const res = await generateCertificateBatch(templateId, courseId, rows);
    setResults(res);
    setLoading(false);
    const ok  = res.filter((r) => r.success).length;
    const err = res.filter((r) => !r.success).length;
    if (ok > 0) { toast.success(`${ok} certificado(s) emitidos.`); onSuccess(); }
    if (err > 0) toast.warning(`${err} fila(s) con error.`);
  }

  const extraHeaders = headers.filter((h) => !["apellidos","nombre","dni"].includes(h)); // codigo y custom fields se muestran

  return (
    <div className="flex flex-col gap-4 pt-4">
      {/* Plantilla + Curso */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Plantilla">
          {templates.length === 0 ? <AlertBox>Sin plantillas.</AlertBox> : (
            <ComboBox items={templates} value={templateId} onChange={setTemplateId} open={openTpl} setOpen={setOpenTpl}
              placeholder="Plantilla..." renderItem={(t) => t.name} renderSelected={(t) => t.name}
              renderRow={(t) => <span>{t.name}</span>} />
          )}
        </Field>
        <Field label="Curso">
          <ComboBox items={courses} value={courseId} onChange={setCourseId} open={openCou} setOpen={setOpenCou}
            placeholder="Curso..." renderItem={(c) => c.title} renderSelected={(c) => c.title}
            renderRow={(c) => <span className="text-sm">{c.title}</span>} />
        </Field>
      </div>

      {/* Download template + Upload */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2 text-sm">
          <Download className="size-4" />
          Descargar plantilla .xlsx
        </Button>
        <div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFile} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full gap-2 text-sm">
            <Upload className="size-4" />
            {rows.length > 0 ? `${rows.length} fila(s) — cambiar` : "Subir .xlsx / .csv"}
          </Button>
        </div>
      </div>
      {rows.length === 0 && (
        <p className="text-[11px] text-[var(--color-neutral-400)] -mt-2">
          Descarga la plantilla, complétala y súbela. <strong>dni</strong> es obligatorio. <strong>codigo</strong> es opcional — déjalo vacío para generar automático o pon el código existente.
        </p>
      )}

      {/* Preview table */}
      {rows.length > 0 && !results && (
        <div className="rounded-lg border border-[var(--color-neutral-200)] overflow-hidden">
          <div className="px-3 py-2 bg-[var(--color-neutral-50)] border-b border-[var(--color-neutral-100)]">
            <p className="text-xs font-semibold text-[var(--color-neutral-700)]">Vista previa — {rows.length} certificados</p>
          </div>
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-neutral-100)]">
                  {["#", "DNI", "Apellidos", "Nombre", ...extraHeaders].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-[var(--color-neutral-500)] font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-neutral-100)]">
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-[var(--color-neutral-400)]">{i + 1}</td>
                    <td className="px-3 py-1.5 font-mono">{r.dni}</td>
                    <td className="px-3 py-1.5">{r.apellidos}</td>
                    <td className="px-3 py-1.5">{r.nombre}</td>
                    {extraHeaders.map((h) => (
                      <td key={h} className="px-3 py-1.5 text-[var(--color-neutral-500)]">{r[h] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="rounded-lg border border-[var(--color-neutral-200)] overflow-hidden">
          <div className="px-3 py-2 bg-[var(--color-neutral-50)] border-b border-[var(--color-neutral-100)]">
            <p className="text-xs font-semibold text-[var(--color-neutral-700)]">
              Resultado — {results.filter((r) => r.success).length} ok / {results.filter((r) => !r.success).length} errores
            </p>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-[var(--color-neutral-100)]">
            {results.map((r) => (
              <div key={r.row} className="flex items-center gap-2.5 px-3 py-2">
                {r.success
                  ? <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                  : <XCircle className="size-4 text-red-500 shrink-0" />}
                <span className="text-xs text-[var(--color-neutral-400)] shrink-0">#{r.row}</span>
                <span className="text-xs font-medium text-[var(--color-neutral-900)] truncate">{r.nombre}</span>
                <span className="text-xs font-mono text-[var(--color-neutral-400)] shrink-0">{r.dni}</span>
                {!r.success && <span className="text-xs text-red-500 ml-auto shrink-0">{r.message}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          onClick={handleEmitAll}
          disabled={loading || !templateId || !courseId || rows.length === 0}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
        >
          {loading ? <><Loader2 className="size-4 mr-1.5 animate-spin" />Emitiendo...</> : <><FileText className="size-4 mr-1.5" />Emitir {rows.length > 0 ? rows.length : ""} certificados</>}
        </Button>
      </div>
    </div>
  );
}

// ── External tab (creates silent user if not registered) ─────────────────────

function ExternalTab({ templates, courses, onClose }: { templates: Template[]; courses: Course[]; onClose: () => void }) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState("");
  const [courseId,   setCourseId]   = useState("");
  const [openTpl,    setOpenTpl]    = useState(false);
  const [openCou,    setOpenCou]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const customFields = selectedTemplate?.customFields ?? [];

  const [fields, setFields] = useState<Record<string, string>>({
    nombre: "", apellidos: "", dni: "", email: "",
  });

  function setField(key: string, val: string) {
    setFields((prev) => ({ ...prev, [key]: val }));
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    const next: Record<string, string> = { ...fields };
    for (const f of tpl?.customFields ?? []) {
      if (!(f.name in next) || !next[f.name]) next[f.name] = f.defaultValue;
    }
    setFields(next);
  }

  async function handlePreview() {
    if (!templateId) { toast.error("Selecciona una plantilla."); return; }
    setPreviewing(true);
    const customInputs: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) if (v && k !== "email") customInputs[k] = v;
    const res = await previewCertificate(templateId, undefined, courseId || undefined, customInputs);
    setPreviewing(false);
    if (res.pdf) {
      const bytes = Uint8Array.from(atob(res.pdf), (c) => c.charCodeAt(0));
      window.open(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })), "_blank");
    } else {
      toast.error(res.message ?? "Error al generar vista previa.");
    }
  }

  async function handleGenerate() {
    if (!templateId || !courseId) { toast.error("Selecciona plantilla y curso."); return; }
    if (!fields.nombre.trim() || !fields.apellidos.trim()) {
      toast.error("Nombre y apellidos son obligatorios."); return;
    }
    if (!fields.dni.trim()) { toast.error("DNI es obligatorio."); return; }
    if (!fields.email.trim()) { toast.error("Correo electrónico es obligatorio."); return; }

    setLoading(true);
    const res = await generateCertificateExternal({
      templateId,
      courseId,
      ...fields,
    } as ExternalCertificateInput);
    setLoading(false);

    if (res.certificateId) {
      const msg = res.studentCreated
        ? "Certificado emitido. Se creó una cuenta inactiva para el alumno."
        : "Certificado emitido para alumno existente.";
      toast.success(msg);
      onClose();
      router.refresh();
    } else {
      toast.error(res.message ?? "Error al emitir.");
    }
  }

  const personFields = [
    { key: "apellidos", label: "Apellidos *",           col: 1 },
    { key: "nombre",    label: "Nombre *",              col: 1 },
    { key: "dni",       label: "DNI *",                 col: 1 },
    { key: "email",     label: "Correo electrónico *",  col: 1, type: "email" },
  ];

  return (
    <div className="flex flex-col gap-4 pt-4">
      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
        <AlertCircle className="size-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Si el DNI no está registrado, se creará una cuenta <strong>inactiva</strong> automáticamente. Si proporcionas correo, el alumno podrá activar su cuenta y acceder al aula más adelante.
        </p>
      </div>

      {/* Plantilla + Curso */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Plantilla">
          {templates.length === 0 ? <AlertBox>Sin plantillas.</AlertBox> : (
            <ComboBox items={templates} value={templateId} onChange={handleTemplateChange}
              open={openTpl} setOpen={setOpenTpl} placeholder="Selecciona plantilla..."
              renderItem={(t) => t.name} renderSelected={(t) => t.name}
              renderRow={(t) => <span>{t.name}{!t.hasDesign && <span className="ml-2 text-[10px] text-amber-600">sin diseño</span>}</span>} />
          )}
        </Field>
        <Field label="Curso">
          <ComboBox items={courses} value={courseId} onChange={setCourseId}
            open={openCou} setOpen={setOpenCou} placeholder="Selecciona curso..."
            renderItem={(c) => c.title} renderSelected={(c) => c.title}
            renderRow={(c) => <span className="text-sm">{c.title}</span>} />
        </Field>
      </div>

      {/* Datos de la persona */}
      <div className="rounded-lg border border-[var(--color-neutral-200)] overflow-hidden">
        <div className="px-4 py-2 bg-[var(--color-neutral-50)] border-b border-[var(--color-neutral-100)]">
          <p className="text-xs font-semibold text-[var(--color-neutral-700)]">Datos del participante</p>
          <p className="text-[10px] text-[var(--color-neutral-400)]">El certificado queda registrado y el código QR es verificable</p>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {personFields.map((f) => (
            <div key={f.key} className={cn("flex flex-col gap-1", f.col === 2 && "col-span-2")}>
              <Label className="text-xs">{f.label}</Label>
              {f.multiline ? (
                <Textarea rows={2} className="text-sm resize-none"
                  value={fields[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} />
              ) : (
                <Input type={f.type ?? "text"} className="h-9 text-sm"
                  value={fields[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} />
              )}
            </div>
          ))}
          {customFields.map((f) => (
            <div key={f.name} className="flex flex-col gap-1">
              <Label className="text-xs capitalize">{f.name}</Label>
              <Input className="h-9 text-sm"
                value={fields[f.name] ?? ""} onChange={(e) => setField(f.name, e.target.value)} />
            </div>
          ))}
          <div className="col-span-2">
            <div className="flex h-9 items-center rounded-md border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-3 text-xs text-[var(--color-neutral-400)]">
              Código: RC-XXXX-26 (auto) &nbsp;·&nbsp; QR de verificación (auto)
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between gap-2 pt-1">
        <Button variant="outline" onClick={handlePreview} disabled={previewing || !templateId} className="shrink-0">
          {previewing ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Eye className="size-4 mr-1.5" />}
          Vista previa
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || !templateId || !courseId}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
          >
            {loading
              ? <><Loader2 className="size-4 mr-1.5 animate-spin" />Emitiendo...</>
              : <><Award className="size-4 mr-1.5" />Emitir certificado</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── tiny helpers ──────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function AlertBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <AlertCircle className="size-4 text-amber-600 shrink-0" />
      <p className="text-xs text-amber-700">{children}</p>
    </div>
  );
}

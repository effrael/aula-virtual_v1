"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Award, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateCertificate } from "@/app/actions/certificates";

type Student = { id: string; full_name: string };
type Course = { id: string; title: string };
type Template = {
  id: string;
  name: string;
  hasDesign: boolean;
  fieldNames: string[];
};

type Props = {
  students: Student[];
  courses: Course[];
  templates: Template[];
};

// Campos que se llenan automáticamente desde la base de datos
const AUTO_FIELDS = new Set(["nombre", "curso", "fecha", "nota", "codigo", "qr"]);

export function IssueCertificateDialog({ students, courses, templates }: Props) {
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [score, setScore] = useState("100");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [studentSearch, setStudentSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");

  const router = useRouter();

  const selectedTemplate = templates.find((t) => t.id === templateId);

  // Campos personalizados = campos del template que no son auto-llenados
  const customFields = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.fieldNames.filter((name) => !AUTO_FIELDS.has(name));
  }, [selectedTemplate]);

  const filteredStudents = studentSearch
    ? students.filter((s) =>
        s.full_name.toLowerCase().includes(studentSearch.toLowerCase())
      )
    : students;

  const filteredCourses = courseSearch
    ? courses.filter((c) =>
        c.title.toLowerCase().includes(courseSearch.toLowerCase())
      )
    : courses;

  const selectedStudent = students.find((s) => s.id === studentId);
  const selectedCourse = courses.find((c) => c.id === courseId);

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    setCustomValues({});
  }

  function handleCustomValueChange(field: string, value: string) {
    setCustomValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!templateId) {
      toast.error("Selecciona una plantilla.");
      return;
    }
    if (!studentId || !courseId) {
      toast.error("Selecciona un alumno y un curso.");
      return;
    }

    const scoreNum = parseInt(score, 10);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      toast.error("La nota debe estar entre 0 y 100.");
      return;
    }

    // Validar que todos los campos personalizados estén llenos
    const emptyCustom = customFields.filter((f) => !customValues[f]?.trim());
    if (emptyCustom.length > 0) {
      toast.error(`Completa los campos: ${emptyCustom.join(", ")}`);
      return;
    }

    setLoading(true);
    const res = await generateCertificate(
      studentId,
      courseId,
      scoreNum,
      templateId,
      customFields.length > 0 ? customValues : undefined
    );
    setLoading(false);

    if (res.certificateId) {
      toast.success("Certificado emitido correctamente.");
      setOpen(false);
      resetForm();
      router.refresh();
    } else {
      toast.error(res.message ?? "Error al emitir el certificado.");
    }
  }

  function resetForm() {
    setTemplateId("");
    setStudentId("");
    setCourseId("");
    setScore("100");
    setCustomValues({});
    setStudentSearch("");
    setCourseSearch("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-[var(--color-neutral-200)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)] shrink-0"
        >
          <Award className="size-4 mr-1.5" />
          Emitir certificado
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emitir certificado manualmente</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Plantilla */}
          <div className="flex flex-col gap-1.5">
            <Label>Plantilla</Label>
            {templates.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertCircle className="size-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">
                  No hay plantillas creadas. Crea una plantilla primero.
                </p>
              </div>
            ) : (
              <>
                <select
                  value={templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-[var(--color-neutral-200)] bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                >
                  <option value="">Selecciona una plantilla...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {!t.hasDesign ? "(sin diseño)" : ""}
                    </option>
                  ))}
                </select>
                {selectedTemplate && !selectedTemplate.hasDesign && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    Esta plantilla no tiene diseño. El certificado se registrará sin PDF.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Alumno */}
          <div className="flex flex-col gap-1.5">
            <Label>Alumno</Label>
            {selectedStudent ? (
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-neutral-200)] px-3 py-2">
                <span className="text-sm text-[var(--color-neutral-900)]">
                  {selectedStudent.full_name}
                </span>
                <button
                  type="button"
                  onClick={() => { setStudentId(""); setStudentSearch(""); }}
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Buscar alumno por nombre..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                {studentSearch && (
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-[var(--color-neutral-200)] divide-y divide-[var(--color-neutral-100)]">
                    {filteredStudents.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-[var(--color-neutral-400)]">
                        Sin resultados.
                      </p>
                    ) : (
                      filteredStudents.slice(0, 20).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setStudentId(s.id); setStudentSearch(""); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-neutral-50)] transition-colors"
                        >
                          {s.full_name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Curso */}
          <div className="flex flex-col gap-1.5">
            <Label>Curso</Label>
            {selectedCourse ? (
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-neutral-200)] px-3 py-2">
                <span className="text-sm text-[var(--color-neutral-900)]">
                  {selectedCourse.title}
                </span>
                <button
                  type="button"
                  onClick={() => { setCourseId(""); setCourseSearch(""); }}
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Buscar curso por título..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                />
                {courseSearch && (
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-[var(--color-neutral-200)] divide-y divide-[var(--color-neutral-100)]">
                    {filteredCourses.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-[var(--color-neutral-400)]">
                        Sin resultados.
                      </p>
                    ) : (
                      filteredCourses.slice(0, 20).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setCourseId(c.id); setCourseSearch(""); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-neutral-50)] transition-colors"
                        >
                          {c.title}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Nota */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cert-score">Nota (%)</Label>
            <Input
              id="cert-score"
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>

          {/* Campos dinámicos personalizados */}
          {customFields.length > 0 && (
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-4">
              <p className="text-xs font-medium text-[var(--color-neutral-600)]">
                Campos adicionales de la plantilla
              </p>
              {customFields.map((field) => (
                <div key={field} className="flex flex-col gap-1">
                  <Label htmlFor={`custom-${field}`} className="capitalize">
                    {field}
                  </Label>
                  <Input
                    id={`custom-${field}`}
                    placeholder={`Ingresa ${field}...`}
                    value={customValues[field] ?? ""}
                    onChange={(e) => handleCustomValueChange(field, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Info campos automáticos */}
          {selectedTemplate?.hasDesign && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-xs text-blue-700">
                Los campos <strong>nombre</strong>, <strong>curso</strong>, <strong>fecha</strong>, <strong>nota</strong>, <strong>codigo</strong> y <strong>qr</strong> se llenan automáticamente.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !templateId || !studentId || !courseId}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
            >
              {loading ? "Emitiendo..." : "Emitir certificado"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

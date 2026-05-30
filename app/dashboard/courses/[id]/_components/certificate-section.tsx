"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updateCourseCertificate } from "@/app/actions/courses";

type TemplateField = { name: string; defaultValue: string };

interface Template {
  id: string;
  name: string;
  customFields: TemplateField[];
}

interface Props {
  courseId: string;
  templates: Template[];
  initialTemplateId: string | null;
  initialCustomInputs: Record<string, string> | null;
}

const AUTO_FIELDS = ["nombre", "apellidos", "dni", "codigo", "qr"];

export const FIELD_SOURCES = [
  { value: "__manual__",             label: "Valor manual"          },
  { value: "__fecha__",              label: "Fecha de emisión"       },
  { value: "__curso__",              label: "Título del curso"       },
  { value: "__docente.nombre__",     label: "Docente — nombres"      },
  { value: "__docente.apellidos__",  label: "Docente — apellidos"    },
  { value: "__docente.dni__",        label: "Docente — DNI"          },
  { value: "__nombre__",             label: "Alumno — nombres"       },
  { value: "__apellidos__",          label: "Alumno — apellidos"     },
  { value: "__dni__",                label: "Alumno — DNI"           },
] as const;

const TOKEN_VALUES = new Set(FIELD_SOURCES.map((s) => s.value).filter((v) => v !== "__manual__"));

function isToken(val: string) {
  return TOKEN_VALUES.has(val as any);
}

export function CertificateSection({
  courseId,
  templates,
  initialTemplateId,
  initialCustomInputs,
}: Props) {
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "");
  // Per-field: store either a token ("__fecha__") or a literal string
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(
    initialCustomInputs ?? {}
  );
  const [pending, startTransition] = useTransition();

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const customFields = selectedTemplate?.customFields ?? [];

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    const next: Record<string, string> = {};
    for (const f of tpl?.customFields ?? []) {
      next[f.name] = initialCustomInputs?.[f.name] ?? f.defaultValue;
    }
    setFieldValues(next);
  }

  function setFieldValue(fieldName: string, val: string) {
    setFieldValues((prev) => ({ ...prev, [fieldName]: val }));
  }

  function handleSave() {
    startTransition(async () => {
      const customInputs = Object.keys(fieldValues).length > 0 ? fieldValues : null;
      const res = await updateCourseCertificate(courseId, templateId || null, customInputs);
      if (res?.success) {
        toast.success("Configuración de certificado guardada.");
      } else {
        toast.error(res?.message ?? "Error al guardar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 p-5 bg-white rounded-xl border border-[var(--color-neutral-200)]">
      <div className="flex items-center gap-2">
        <Award className="size-4 text-[var(--color-neutral-500)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
            Certificado de finalización
          </p>
          <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
            Configura la plantilla y el origen de cada campo al emitir.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Selector de plantilla */}
        <div className="flex flex-col gap-1.5">
          <Label>Plantilla de certificado</Label>
          {templates.length === 0 ? (
            <p className="text-xs text-amber-600">
              No hay plantillas. Crea una en{" "}
              <a href="/dashboard/certificates" className="underline">Certificados</a>.
            </p>
          ) : (
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-[var(--color-neutral-200)] bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
            >
              <option value="">Sin plantilla asignada</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Auto-fields badge */}
        {selectedTemplate && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-xs text-blue-700 font-medium mb-1">
              Campos llenados automáticamente:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {AUTO_FIELDS.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 text-[10px] font-mono bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full"
                >
                  <CheckCircle2 className="size-2.5" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Campos custom con selector de fuente */}
        {customFields.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-[var(--color-neutral-700)]">
              Origen de cada campo
            </p>
            <div className="flex flex-col gap-3">
              {customFields.map((f) => {
                const current = fieldValues[f.name] ?? "";
                const currentIsToken = isToken(current);
                const selectVal = currentIsToken ? current : "__manual__";
                const manualVal = currentIsToken ? "" : current;

                return (
                  <div key={f.name} className="rounded-lg border border-[var(--color-neutral-200)] p-3 flex flex-col gap-2">
                    <Label className="capitalize text-xs text-[var(--color-neutral-700)]">
                      {f.name}
                    </Label>

                    {/* Selector de fuente */}
                    <select
                      value={selectVal}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__manual__") {
                          setFieldValue(f.name, "");
                        } else {
                          setFieldValue(f.name, val);
                        }
                      }}
                      className="flex h-9 w-full rounded-md border border-[var(--color-neutral-200)] bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                    >
                      {FIELD_SOURCES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>

                    {/* Input manual — solo cuando fuente es "Valor manual" */}
                    {selectVal === "__manual__" && (
                      <Input
                        className="h-9 text-sm"
                        value={manualVal}
                        placeholder={f.defaultValue || `Escribe el valor de «${f.name}»`}
                        onChange={(e) => setFieldValue(f.name, e.target.value)}
                      />
                    )}

                    {/* Preview del token seleccionado */}
                    {currentIsToken && (
                      <p className="text-[10px] text-[var(--color-neutral-400)] font-mono">
                        Token: {current}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedTemplate && customFields.length === 0 && (
          <p className="text-xs text-[var(--color-neutral-400)]">
            Esta plantilla no tiene campos personalizados adicionales.
          </p>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={pending} size="sm">
            {pending ? "Guardando..." : "Guardar configuración"}
          </Button>
        </div>
      </div>
    </div>
  );
}

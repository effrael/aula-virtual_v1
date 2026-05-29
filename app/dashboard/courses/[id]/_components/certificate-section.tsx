"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateCourseCertificate } from "@/app/actions/courses";

interface Template {
  id: string;
  name: string;
}

interface Props {
  courseId: string;
  templates: Template[];
  initialTemplateId: string | null;
  initialDescription: string | null;
}

const AUTO_FIELDS = ["nombre", "apellidos", "dni", "descripcion", "codigo", "qr"];

export function CertificateSection({
  courseId,
  templates,
  initialTemplateId,
  initialDescription,
}: Props) {
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [pending, startTransition] = useTransition();

  const selectedTemplate = templates.find((t) => t.id === templateId);

  function handleSave() {
    startTransition(async () => {
      const res = await updateCourseCertificate(
        courseId,
        templateId || null,
        description || null
      );
      if (res?.success) {
        toast.success("Configuración de certificado guardada.");
      } else {
        toast.error(res?.message ?? "Error al guardar.");
      }
    });
  }

  return (
    <>
    {/*
    <div className="flex flex-col gap-4 p-5 bg-white rounded-xl border border-[var(--color-neutral-200)]">

      <div className="flex items-center gap-2">
        <Award className="size-4 text-[var(--color-neutral-500)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
            Certificado de finalización
          </p>
          <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
            Configura qué plantilla y descripción se usarán al emitir el certificado automáticamente.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Plantilla de certificado</Label>
          {templates.length === 0 ? (
            <p className="text-xs text-amber-600">
              No hay plantillas disponibles. Crea una en{" "}
              <a href="/dashboard/certificates" className="underline">
                Certificados
              </a>
              .
            </p>
          ) : (
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-[var(--color-neutral-200)] bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
            >
              <option value="">Sin plantilla asignada</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {selectedTemplate && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-xs text-blue-700 font-medium mb-1">
              Campos llenados automáticamente al emitir:
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
        <div className="flex flex-col gap-1.5">
          <Label>
            Descripción del certificado
            <span className="ml-1 text-xs text-[var(--color-neutral-400)] font-normal">
              (campo «descripcion» en la plantilla)
            </span>
          </Label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Por haber completado satisfactoriamente el curso..."
            className="flex w-full rounded-md border border-[var(--color-neutral-200)] bg-transparent px-3 py-2 text-sm shadow-xs resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={pending} size="sm">
            {pending ? "Guardando..." : "Guardar configuración"}
          </Button>
        </div>
      </div>
    </div> */}
    </>
  );
}

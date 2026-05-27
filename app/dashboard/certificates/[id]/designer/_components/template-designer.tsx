"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { savePdfmeTemplate } from "@/app/actions/certificate-templates";
import { Save, Loader2 } from "lucide-react";

type Props = {
  templateId: string;
  pdfUrl: string;
  pdfmeTemplate: Record<string, unknown>;
};

export function TemplateDesigner({ templateId, pdfUrl, pdfmeTemplate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const designerRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    async function init() {
      // Load everything in parallel
      const [{ Designer }, schemas, pdfResponse] = await Promise.all([
        import("@pdfme/ui"),
        import("@pdfme/schemas"),
        fetch(pdfUrl),
      ]);

      if (cancelled || !containerRef.current) return;

      const basePdf = new Uint8Array(await pdfResponse.arrayBuffer());
      const { text, image, barcodes } = schemas;

      const hasTemplate = pdfmeTemplate && Object.keys(pdfmeTemplate).length > 0;

      const template = hasTemplate
        ? { ...(pdfmeTemplate as any), basePdf }
        : {
            basePdf,
            schemas: [
              [
                {
                  name: "nombre",
                  type: "text",
                  position: { x: 50, y: 80 },
                  width: 100,
                  height: 10,
                  fontSize: 16,
                },
                {
                  name: "curso",
                  type: "text",
                  position: { x: 50, y: 100 },
                  width: 100,
                  height: 10,
                  fontSize: 14,
                },
                {
                  name: "fecha",
                  type: "text",
                  position: { x: 50, y: 120 },
                  width: 100,
                  height: 10,
                  fontSize: 12,
                },
                {
                  name: "nota",
                  type: "text",
                  position: { x: 50, y: 140 },
                  width: 40,
                  height: 10,
                  fontSize: 12,
                },
                {
                  name: "codigo",
                  type: "text",
                  position: { x: 50, y: 155 },
                  width: 100,
                  height: 8,
                  fontSize: 8,
                },
                {
                  name: "qr",
                  type: "qrcode",
                  position: { x: 160, y: 120 },
                  width: 30,
                  height: 30,
                },
              ],
            ],
          };

      const designer = new Designer({
        domContainer: containerRef.current!,
        template,
        plugins: { text, image, ...barcodes },
      });

      designerRef.current = designer;
      setLoaded(true);
    }

    init();

    return () => {
      cancelled = true;
      if (designerRef.current) {
        designerRef.current.destroy();
        designerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (!designerRef.current) return;

    setSaving(true);
    const tpl = designerRef.current.getTemplate();
    const { basePdf, ...templateToSave } = tpl;
    const res = await savePdfmeTemplate(templateId, templateToSave);
    setSaving(false);

    if (res.success) {
      toast.success("Diseño guardado correctamente.");
    } else {
      toast.error(res.message ?? "Error al guardar el diseño.");
    }
  }

  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-neutral-500)]">
          Campos disponibles: nombre, curso, fecha, nota, codigo (UUID de verificación), qr (QR que lleva a la página de verificación).
        </p>
        <Button
          onClick={handleSave}
          disabled={saving || !loaded}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
        >
          <Save className="size-4 mr-1.5" />
          {saving ? "Guardando..." : "Guardar diseño"}
        </Button>
      </div>

      <div className="relative flex-1 min-h-[500px] rounded-lg border border-[var(--color-neutral-200)] overflow-hidden">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10">
            <Loader2 className="size-8 text-[var(--color-primary)] animate-spin" />
            <p className="text-sm text-[var(--color-neutral-500)]">Cargando diseñador...</p>
          </div>
        )}
        <div ref={containerRef} className="size-full" />
      </div>
    </div>
  );
}

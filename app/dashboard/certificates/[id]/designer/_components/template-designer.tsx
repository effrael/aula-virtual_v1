"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePdfmeTemplate, saveCustomFonts } from "@/app/actions/certificate-templates";
import { getCertificateFonts, type CustomFont } from "@/lib/certificate-fonts";
import { Save, Loader2, MoveRight } from "lucide-react";

type Props = {
  templateId: string;
  pdfUrl: string;
  pdfmeTemplate: Record<string, unknown>;
  customFonts: CustomFont[];
};

const AUTO_FIELDS = ["nombre", "apellidos", "dni", "codigo", "qr"];

type FieldEntry = { name: string; type: string; page: number };

export function TemplateDesigner({ templateId, pdfUrl, pdfmeTemplate, customFonts: initialCustomFonts }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const designerRef  = useRef<any>(null);

  const [saving,    setSaving]  = useState(false);
  const [loaded,    setLoaded]  = useState(false);
  const [fields,    setFields]  = useState<FieldEntry[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [customFonts] = useState<CustomFont[]>(initialCustomFonts);

  function extractFields(schemas: any[][]): FieldEntry[] {
    return schemas.flatMap((page, pageIdx) =>
      (page ?? []).map((f: any) => ({
        name: f.name,
        type: f.type ?? "text",
        page: pageIdx,
      }))
    );
  }

  // Re-inicializar el designer cuando cambien las fuentes custom
  const fontsKey = customFonts.map((f) => f.name).join(",");

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    async function init() {
      const [{ Designer }, schemas, pdfResponse, font] = await Promise.all([
        import("@pdfme/ui"),
        import("@pdfme/schemas"),
        fetch(pdfUrl),
        getCertificateFonts(customFonts),
      ]);

      if (cancelled || !containerRef.current) return;

      const basePdf = new Uint8Array(await pdfResponse.arrayBuffer());
      const { text, image, barcodes } = schemas;

      function countPdfPages(bytes: Uint8Array): number {
        const raw = new TextDecoder("latin1").decode(bytes);
        const matches = raw.match(/\/Type\s*\/Page[^s]/g);
        return Math.max(1, matches?.length ?? 1);
      }

      const hasTemplate = pdfmeTemplate && Object.keys(pdfmeTemplate).length > 0;

      const defaultFields = [
        { name: "nombre",    type: "text",   position: { x: 50, y: 70  }, width: 110, height: 12, fontSize: 18 },
        { name: "apellidos", type: "text",   position: { x: 50, y: 85  }, width: 110, height: 12, fontSize: 18 },
        { name: "dni",       type: "text",   position: { x: 50, y: 100 }, width: 60,  height: 8,  fontSize: 10 },
        { name: "codigo",    type: "text",   position: { x: 50, y: 120 }, width: 80,  height: 8,  fontSize: 8  },
        { name: "qr",        type: "qrcode", position: { x: 160, y: 105 }, width: 30, height: 30               },
      ];

      const pdfPageCount = countPdfPages(basePdf);
      setPageCount(pdfPageCount);

      const template = hasTemplate
        ? { ...(pdfmeTemplate as any), basePdf }
        : {
            basePdf,
            schemas: [
              defaultFields,
              ...Array.from({ length: pdfPageCount - 1 }, () => []),
            ],
          };

      // Destruir instancia previa si existe (re-init por cambio de fuentes)
      if (designerRef.current) {
        designerRef.current.destroy();
        designerRef.current = null;
      }

      const designer = new Designer({
        domContainer: containerRef.current!,
        template,
        plugins: { text, image, ...barcodes },
        options: { font },
      });

      designer.onChangeTemplate = (updated: any) => {
        setFields(extractFields(updated.schemas ?? []));
        setPageCount(updated.schemas?.length ?? 1);
      };

      designerRef.current = designer;
      setFields(extractFields(template.schemas as any[][]));
      setLoaded(true);
    }

    setLoaded(false);
    init();

    return () => {
      cancelled = true;
      if (designerRef.current) {
        designerRef.current.destroy();
        designerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsKey]);

  function moveField(fieldName: string, fromPage: number, toPage: number) {
    if (!designerRef.current || fromPage === toPage) return;
    const tpl = designerRef.current.getTemplate();
    const schemas: any[][] = tpl.schemas ?? [];
    const field = schemas[fromPage]?.find((f: any) => f.name === fieldName);
    if (!field) return;
    const newSchemas = schemas.map((page: any[], idx: number) => {
      if (idx === fromPage) return page.filter((f: any) => f.name !== fieldName);
      if (idx === toPage)   return [...page, { ...field }];
      return page;
    });
    designerRef.current.updateTemplate({ ...tpl, schemas: newSchemas });
    toast.success(`"${fieldName}" movido a la hoja ${toPage + 1}.`);
  }

  async function handleSave() {
    if (!designerRef.current) return;
    setSaving(true);
    const tpl = designerRef.current.getTemplate();
    const { basePdf, ...templateToSave } = tpl;
    const res = await savePdfmeTemplate(templateId, templateToSave);
    setSaving(false);
    if (res.success) toast.success("Diseño guardado.");
    else toast.error(res.message ?? "Error al guardar.");
  }


  return (
    <div className="flex flex-col gap-4 flex-1">

      {/* Barra superior */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-[var(--color-neutral-500)]">
          Campos auto-llenados:{" "}
          {AUTO_FIELDS.map((f) => (
            <span key={f} className="font-mono bg-[var(--color-neutral-100)] px-1 py-0.5 rounded mr-1">{f}</span>
          ))}
        </p>
        <Button
          onClick={handleSave}
          disabled={saving || !loaded}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shrink-0"
        >
          <Save className="size-4 mr-1.5" />
          {saving ? "Guardando..." : "Guardar diseño"}
        </Button>
      </div>

      {/* Diseñador pdfme */}
      <div className="relative flex-1 min-h-[500px] rounded-lg border border-[var(--color-neutral-200)] overflow-hidden">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10">
            <Loader2 className="size-8 text-[var(--color-primary)] animate-spin" />
            <p className="text-sm text-[var(--color-neutral-500)]">Cargando diseñador...</p>
          </div>
        )}
        <div ref={containerRef} className="size-full" />
      </div>

      {/* Panel: mover campos entre hojas */}
      {loaded && fields.length > 0 && (
        <div className="rounded-lg border border-[var(--color-neutral-200)] bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-neutral-100)] bg-[var(--color-neutral-50)]">
            <p className="text-xs font-semibold text-[var(--color-neutral-700)]">
              Campos — mover entre hojas
            </p>
          </div>
          <div className="divide-y divide-[var(--color-neutral-100)]">
            {fields.map((field) => (
              <div key={`${field.name}-${field.page}`} className="flex items-center justify-between px-4 py-2.5 gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    AUTO_FIELDS.includes(field.name)
                      ? "bg-blue-50 text-blue-600"
                      : "bg-violet-50 text-violet-600"
                  }`}>
                    {AUTO_FIELDS.includes(field.name) ? "auto" : "custom"}
                  </span>
                  <span className="text-sm font-mono text-[var(--color-neutral-900)] truncate">{field.name}</span>
                  <span className="text-xs text-[var(--color-neutral-400)]">({field.type})</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[var(--color-neutral-500)]">Hoja {field.page + 1}</span>
                  {pageCount > 1 && (
                    <>
                      <MoveRight className="size-3 text-[var(--color-neutral-300)]" />
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const target = parseInt(e.target.value);
                          if (!isNaN(target)) { moveField(field.name, field.page, target); e.target.value = ""; }
                        }}
                        className="text-xs border border-[var(--color-neutral-200)] rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                      >
                        <option value="" disabled>Mover a...</option>
                        {Array.from({ length: pageCount }, (_, i) => i)
                          .filter((i) => i !== field.page)
                          .map((i) => (
                            <option key={i} value={i}>Hoja {i + 1}</option>
                          ))}
                      </select>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

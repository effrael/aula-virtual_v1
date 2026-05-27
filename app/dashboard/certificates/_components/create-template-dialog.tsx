"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { MediaPicker } from "@/components/media-picker";
import { LIBRARY_BUCKET } from "@/lib/storage-utils";
import { createCertificateTemplate } from "@/app/actions/certificate-templates";

export function CreateTemplateDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (!name.trim() || !pdfUrl) {
      toast.error("Nombre y PDF base son requeridos.");
      return;
    }

    setLoading(true);
    const res = await createCertificateTemplate(name, description || null, pdfUrl);
    setLoading(false);

    if (res.success && res.id) {
      toast.success("Plantilla creada correctamente.");
      setOpen(false);
      setName("");
      setDescription("");
      setPdfUrl(null);
      router.push(`/dashboard/certificates/${res.id}/designer`);
    } else {
      toast.error(res.message ?? "Error al crear la plantilla.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shrink-0">
          <Plus className="size-4 mr-1.5" />
          Nueva plantilla
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva plantilla de certificado</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpl-name">Nombre</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Plantilla estándar"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpl-desc">Descripción (opcional)</Label>
            <Input
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción de la plantilla"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>PDF base</Label>
            <MediaPicker
              bucket={LIBRARY_BUCKET}
              value={pdfUrl}
              onChange={setPdfUrl}
              accept="all"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !name.trim() || !pdfUrl}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
            >
              {loading ? "Creando..." : "Crear y diseñar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

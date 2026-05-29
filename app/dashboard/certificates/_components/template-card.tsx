"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Award, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCertificateTemplate, deleteCertificateTemplate } from "@/app/actions/certificate-templates";

type Props = {
  id: string;
  name: string;
  description: string | null;
};

export function TemplateCard({ id, name, description }: Props) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(name);
  const [newDesc, setNewDesc] = useState(description ?? "");
  const [pending, startTransition] = useTransition();

  function handleRename() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const res = await updateCertificateTemplate(id, {
        name: newName.trim(),
        description: newDesc.trim() || null,
      });
      if (res.success) {
        toast.success("Plantilla actualizada.");
        setRenameOpen(false);
        router.refresh();
      } else {
        toast.error(res.message ?? "Error al actualizar.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteCertificateTemplate(id);
      if (res.success) {
        toast.success("Plantilla eliminada.");
        setDeleteOpen(false);
        router.refresh();
      } else {
        toast.error(res.message ?? "Error al eliminar.");
      }
    });
  }

  return (
    <>
      <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white overflow-hidden flex flex-col">
        <div className="h-32 bg-[var(--color-neutral-100)] flex items-center justify-center border-b border-[var(--color-neutral-200)]">
          <Award className="size-10 text-[var(--color-neutral-300)]" />
        </div>

        <div className="p-4 flex flex-col gap-2 flex-1">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
              {name}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 shrink-0 text-[var(--color-neutral-400)]">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/certificates/${id}/designer`}>
                    Diseñar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setNewName(name); setNewDesc(description ?? ""); setRenameOpen(true); }}>
                  <Pencil className="size-3.5 mr-2" />
                  Renombrar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setDeleteOpen(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="size-3.5 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {description && (
            <p className="text-xs text-[var(--color-neutral-400)] line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Dialog: Renombrar */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar plantilla</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nombre</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre de la plantilla"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Descripción (opcional)</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Breve descripción"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRename} disabled={pending || !newName.trim()}>
                {pending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar eliminación */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar plantilla</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-neutral-600)]">
            ¿Estás seguro de que quieres eliminar <strong>{name}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

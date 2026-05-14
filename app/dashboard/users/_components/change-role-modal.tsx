"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { changeUserRole } from "@/app/actions/users";

type Role = "docente" | "alumno" | "colaborador";

const roleLabels: Record<Role, string> = {
  docente: "Docente",
  alumno: "Alumno",
  colaborador: "Colaborador",
};

interface ChangeRoleModalProps {
  userId: string;
  userName: string;
  currentRole: Role;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangeRoleModal({
  userId,
  userName,
  currentRole,
  open,
  onClose,
  onSuccess,
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<Role>(currentRole);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (selectedRole === currentRole) {
      onClose();
      return;
    }

    startTransition(async () => {
      const result = await changeUserRole(userId, selectedRole);

      if (result.success) {
        toast.success(`Rol de ${userName} cambiado a ${roleLabels[selectedRole]}.`);
        onSuccess();
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar rol</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <p className="text-sm text-[var(--color-neutral-500)]">
            Cambiando el rol de{" "}
            <span className="font-medium text-[var(--color-neutral-900)]">
              {userName}
            </span>
            .
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-neutral-700)]">
              Nuevo rol
            </label>
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as Role)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="docente">Docente</SelectItem>
                <SelectItem value="alumno">Alumno</SelectItem>
                <SelectItem value="colaborador">Colaborador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || selectedRole === currentRole}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar cambio"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

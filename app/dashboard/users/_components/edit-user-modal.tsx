"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateUser, type UpdateUserState } from "@/app/actions/users";

interface EditUserModalProps {
  userId: string;
  fullName: string;
  apellidos: string;
  dni: string;
  email: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserModal({
  userId,
  fullName,
  apellidos,
  dni,
  email,
  open,
  onClose,
  onSuccess,
}: EditUserModalProps) {
  // Deriva nombre quitando apellidos del final de full_name
  const nombre = apellidos && fullName.endsWith(apellidos)
    ? fullName.slice(0, -(apellidos.length + 1)).trim()
    : fullName;
  const boundAction = updateUser.bind(null, userId);
  const [state, action, pending] = useActionState<UpdateUserState, FormData>(
    boundAction,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Usuario actualizado correctamente.");
      onSuccess();
      onClose();
    }
    if (state?.message) {
      toast.error(state.message);
    }
    if (state?.errors) {
      const first = Object.values(state.errors).flat()[0];
      if (first) toast.error(first as string);
    }
  }, [state, onSuccess, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4 mt-2">
          {/* Nombre + Apellidos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nombre" className="text-sm font-medium text-[var(--color-neutral-700)]">
                Nombre
              </label>
              <Input id="nombre" name="nombre" type="text" defaultValue={nombre} required />
              {state?.errors?.nombre && (
                <p className="text-xs text-red-600">{state.errors.nombre[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="apellidos" className="text-sm font-medium text-[var(--color-neutral-700)]">
                Apellidos
              </label>
              <Input id="apellidos" name="apellidos" type="text" defaultValue={apellidos} required />
              {state?.errors?.apellidos && (
                <p className="text-xs text-red-600">{state.errors.apellidos[0]}</p>
              )}
            </div>
          </div>

          {/* DNI */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dni" className="text-sm font-medium text-[var(--color-neutral-700)]">
              DNI
            </label>
            <Input id="dni" name="dni" type="text" defaultValue={dni} maxLength={15} required />
            {state?.errors?.dni && (
              <p className="text-xs text-red-600">{state.errors.dni[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-[var(--color-neutral-700)]"
            >
              Correo electrónico
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={email}
              required
            />
            {state?.errors?.email && (
              <p className="text-xs text-red-600">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
            >
              {pending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

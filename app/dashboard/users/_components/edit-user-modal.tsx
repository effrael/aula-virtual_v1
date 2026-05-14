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
  email: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserModal({
  userId,
  fullName,
  email,
  open,
  onClose,
  onSuccess,
}: EditUserModalProps) {
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
  }, [state, onSuccess, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="full_name"
              className="text-sm font-medium text-[var(--color-neutral-700)]"
            >
              Nombre completo
            </label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              defaultValue={fullName}
              required
            />
            {state?.errors?.full_name && (
              <p className="text-xs text-red-600">{state.errors.full_name[0]}</p>
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

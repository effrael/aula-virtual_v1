"use client";

import { useTransition } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteUser } from "@/app/actions/users";

interface DeleteUserConfirmProps {
  userId: string;
  userName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteUserConfirm({
  userId,
  userName,
  open,
  onClose,
  onSuccess,
}: DeleteUserConfirmProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUser(userId);

      if (result.success) {
        toast.success(`${userName} fue eliminado de la plataforma.`);
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
          <DialogTitle>Eliminar usuario</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <TriangleAlert className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <span className="font-medium">{userName}</span> perderá acceso a la
              plataforma inmediatamente. Esta acción se puede revertir.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Eliminando…
                </>
              ) : (
                "Sí, eliminar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

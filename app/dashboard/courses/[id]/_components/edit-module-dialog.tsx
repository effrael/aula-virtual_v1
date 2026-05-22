"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateModule, type UpdateModuleState } from "@/app/actions/modules";
import type { ModuleRow } from "@/lib/queries/modules";

type Props = {
  module: ModuleRow | null;
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditModuleDialog({
  module,
  courseId,
  open,
  onOpenChange,
}: Props) {
  const [state, action, pending] = useActionState<UpdateModuleState, FormData>(
    updateModule,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Módulo actualizado.");
      onOpenChange(false);
    }
    if (state?.message) {
      toast.error(state.message);
    }
  }, [state, onOpenChange]);

  if (!module) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar módulo</DialogTitle>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4 pt-2">
          <input type="hidden" name="id" value={module.id} />
          <input type="hidden" name="course_id" value={courseId} />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-module-title"
              className="text-sm font-medium text-[var(--color-neutral-700)]"
            >
              Nombre del módulo <span className="text-red-500">*</span>
            </label>
            <Input
              id="edit-module-title"
              name="title"
              defaultValue={module.title}
              disabled={pending}
              autoFocus
            />
            {state?.errors?.title && (
              <p className="text-xs text-red-500">{state.errors.title[0]}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="text-white w-full"
          >
            {pending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

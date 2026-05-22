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
import { createModule, type CreateModuleState } from "@/app/actions/modules";

type Props = {
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateModuleDialog({ courseId, open, onOpenChange }: Props) {
  const [state, action, pending] = useActionState<CreateModuleState, FormData>(
    createModule,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Módulo creado.");
      onOpenChange(false);
    }
    if (state?.message) {
      toast.error(state.message);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo módulo</DialogTitle>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4 pt-2">
          <input type="hidden" name="course_id" value={courseId} />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="module-title"
              className="text-sm font-medium text-[var(--color-neutral-700)]"
            >
              Nombre del módulo <span className="text-red-500">*</span>
            </label>
            <Input
              id="module-title"
              name="title"
              placeholder="Ej. Introducción al curso"
              disabled={pending}
              autoFocus
            />
            {state?.errors?.title && (
              <p className="text-xs text-red-500">{state.errors.title[0]}</p>
            )}
          </div>

          <Button type="submit" disabled={pending} className="text-white w-full">
            {pending ? "Creando..." : "Crear módulo"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

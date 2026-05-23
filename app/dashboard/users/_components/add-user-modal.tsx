"use client";

import { useActionState, useEffect, useState } from "react";
import { UserPlus, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser, type CreateUserState } from "@/app/actions/users";

type Role = "docente" | "alumno" | "colaborador";

const roleLabels: Record<Role, string> = {
  docente: "Docente",
  alumno: "Alumno",
  colaborador: "Colaborador",
};

interface AddUserModalProps {
  /** Si no se pasa, muestra un Select para elegir el rol */
  role?: Role;
  /** Texto del trigger button */
  label?: string;
}

// Formulario en componente separado para que useActionState
// se resetee al desmontar (cuando el dialog cierra)
function CreateUserForm({
  role,
  onSuccess,
  onCancel,
}: {
  role?: Role;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | "">(role ?? "");
  const [password, setPassword] = useState("");

  const [state, action, pending] = useActionState<CreateUserState, FormData>(
    createUser,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Usuario creado exitosamente.", { id: "create-user-success" });
      onSuccess();
    }
    if (state?.message) {
      toast.error(state.message);
    }
    if (state?.errors) {
      const first = Object.values(state.errors).flat()[0];
      if (first) toast.error(first as string);
    }
  }, [state, onSuccess]);

  function generatePassword() {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$!";
    const generated = Array.from(
      { length: 12 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
    setPassword(generated);
    setShowPassword(true);
  }

  return (
    <form action={action} className="flex flex-col gap-4 mt-2">
      {/* Nombre */}
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
          placeholder="Juan García"
          required
        />
        {state?.errors?.full_name && (
          <p className="text-xs text-red-600">
            {state.errors.full_name[0]}
          </p>
        )}
      </div>

      {/* Email */}
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
          placeholder="juan@escuela.com"
          required
        />
        {state?.errors?.email && (
          <p className="text-xs text-red-600">{state.errors.email[0]}</p>
        )}
      </div>

      {/* Contraseña */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-sm font-medium text-[var(--color-neutral-700)]"
          >
            Contraseña temporal
          </label>
          <button
            type="button"
            onClick={generatePassword}
            className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
          >
            <RefreshCw className="size-3" />
            Generar
          </button>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Mínimo 8 caracteres"
            className="pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)] transition-colors"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {state?.errors?.password && (
          <p className="text-xs text-red-600">{state.errors.password[0]}</p>
        )}
      </div>

      {/* Rol */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--color-neutral-700)]">
          Rol
        </label>

        {role ? (
          <>
            <input type="hidden" name="role" value={role} />
            <div className="h-9 px-3 flex items-center rounded-md border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] text-sm text-[var(--color-neutral-500)]">
              {roleLabels[role]}
            </div>
          </>
        ) : (
          <>
            <input type="hidden" name="role" value={selectedRole} />
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as Role)}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="docente">Docente</SelectItem>
                <SelectItem value="alumno">Alumno</SelectItem>
                <SelectItem value="colaborador">Colaborador</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {state?.errors?.role && (
          <p className="text-xs text-red-600">{state.errors.role[0]}</p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending || (!role && !selectedRole)}
          className="cursor-pointer"
        >
          {pending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Creando…
            </>
          ) : (
            "Crear cuenta"
          )}
        </Button>
      </div>
    </form>
  );
}

export function AddUserModal({ role, label }: AddUserModalProps) {
  const [open, setOpen] = useState(false);

  const triggerLabel =
    label ?? (role ? `Agregar ${roleLabels[role]}` : "Agregar usuario");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer">
          <UserPlus className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{triggerLabel}</DialogTitle>
          <DialogDescription className="sr-only">
            Completa los datos para crear un nuevo usuario en la plataforma.
          </DialogDescription>
        </DialogHeader>

        <CreateUserForm
          role={role}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

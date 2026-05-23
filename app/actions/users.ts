"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const roleToPath: Record<string, string> = {
  docente: "/dashboard/users/doc",
  alumno: "/dashboard/users/alumnos",
  colaborador: "/dashboard/users/colaboradores",
};

type Role = "docente" | "alumno" | "colaborador";

// ── Cambiar rol ────────────────────────────────────────────────────────────

export async function changeUserRole(
  userId: string,
  newRole: Role
): Promise<{ success?: boolean; message?: string }> {
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { user_metadata: { role: newRole } }
  );

  if (authError) {
    console.error("[changeUserRole] auth:", authError.message);
    return { message: "No se pudo actualizar el rol. Intenta nuevamente." };
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ role: newRole, status: "activo", deleted_at: null })
    .eq("id", userId);

  if (profileError) {
    console.error("[changeUserRole] profile:", profileError.message);
    return { message: "Rol actualizado en auth pero falló en profiles." };
  }

  revalidatePath(roleToPath[newRole] ?? "/dashboard/users");
  return { success: true };
}

// ── Editar usuario ─────────────────────────────────────────────────────────

const UpdateUserSchema = z.object({
  full_name: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres." })
    .trim(),
  email: z.email({ message: "Ingresa un correo electrónico válido." }).trim(),
});

export type UpdateUserState =
  | { errors?: { full_name?: string[]; email?: string[] }; message?: string; success?: boolean }
  | undefined;

export async function updateUser(
  userId: string,
  _prev: UpdateUserState,
  formData: FormData
): Promise<UpdateUserState> {
  const parsed = UpdateUserSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { full_name, email } = parsed.data;

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { email, user_metadata: { full_name } }
  );

  if (authError) {
    console.error("[updateUser] auth:", authError.message);
    const errorMessages: Record<string, string> = {
      email_exists: "Este correo ya está en uso por otro usuario.",
    };
    return { message: errorMessages[authError.code ?? ""] ?? "Error al actualizar. Intenta nuevamente." };
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ full_name })
    .eq("id", userId);

  if (profileError) {
    console.error("[updateUser] profile:", profileError.message);
    return { message: "Datos actualizados en auth pero falló en profiles." };
  }

  revalidatePath("/dashboard/users", "layout");
  return { success: true };
}

// ── Eliminar usuario (soft delete) ─────────────────────────────────────────

export async function deleteUser(
  userId: string
): Promise<{ success?: boolean; message?: string }> {
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ deleted_at: new Date().toISOString(), status: "inactivo" })
    .eq("id", userId);

  if (profileError) {
    console.error("[deleteUser] profile:", profileError.message);
    return { message: "No se pudo eliminar el usuario. Intenta nuevamente." };
  }

  // Suspender acceso en auth (ban de 100 años = efectivamente deshabilitado)
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });

  revalidatePath("/dashboard/users", "layout");
  return { success: true };
}

// ── Crear usuario ──────────────────────────────────────────────────────────

const CreateUserSchema = z.object({
  full_name: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres." })
    .trim(),
  email: z.email({ message: "Ingresa un correo electrónico válido." }).trim(),
  password: z
    .string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
    .trim(),
  role: z.enum(["docente", "alumno", "colaborador"], {
    message: "Selecciona un rol válido.",
  }),
});

export type CreateUserState =
  | {
      errors?: {
        full_name?: string[];
        email?: string[];
        password?: string[];
        role?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;

export async function createUser(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const raw = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  };
  console.log("[createUser] raw fields:", raw);

  const parsed = CreateUserSchema.safeParse(raw);

  if (!parsed.success) {
    console.log("[createUser] validation errors:", parsed.error.flatten().fieldErrors);
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { full_name, email, password, role } = parsed.data;

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (error) {
    console.error("[createUser]", { code: error.code, status: error.status, message: error.message });
    const errorMessages: Record<string, string> = {
      email_exists: "Este correo ya está registrado en la plataforma.",
      user_already_exists: "Este correo ya está registrado en la plataforma.",
      invalid_email: "El correo electrónico no tiene un formato válido.",
      weak_password: "La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.",
    };
    return { message: errorMessages[error.code ?? ""] ?? "Ocurrió un error inesperado. Intenta nuevamente." };
  }

  revalidatePath(roleToPath[role] ?? "/dashboard/users");
  return { success: true };
}

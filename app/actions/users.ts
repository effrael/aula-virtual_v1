"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionRole } from "@/lib/auth-guard";

const ALLOWED_USER_MGMT = ["admin", "superadmin", "colaborador"];

const USERS_PATH = "/dashboard/users";

type Role = "docente" | "alumno" | "colaborador";

// ── Cambiar rol ────────────────────────────────────────────────────────────

export async function changeUserRole(
  userId: string,
  newRole: Role
): Promise<{ success?: boolean; message?: string }> {
  const role = await getActionRole();
  if (!role || !ALLOWED_USER_MGMT.includes(role)) return { message: "Sin permisos." };

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

  revalidatePath(USERS_PATH);
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
  const role = await getActionRole();
  if (!role || !ALLOWED_USER_MGMT.includes(role)) return { message: "Sin permisos." };

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
  const role = await getActionRole();
  if (!role || !ALLOWED_USER_MGMT.includes(role)) return { message: "Sin permisos." };

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
  const callerRole = await getActionRole();
  if (!callerRole || !ALLOWED_USER_MGMT.includes(callerRole)) return { message: "Sin permisos." };

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

  revalidatePath(USERS_PATH);
  return { success: true };
}

// ── Desactivar usuario activo ─────────────────────────────────────────────

export async function deactivateUser(
  userId: string
): Promise<{ success?: boolean; message?: string }> {
  const currentRole = await getActionRole();
  if (!currentRole || !ALLOWED_USER_MGMT.includes(currentRole)) return { message: "Sin permisos." };

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ status: "inactivo" })
    .eq("id", userId);

  if (profileError) {
    console.error("[deactivateUser] profile:", profileError.message);
    return { message: "No se pudo desactivar el usuario. Intenta nuevamente." };
  }

  await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });

  revalidatePath(USERS_PATH, "layout");
  return { success: true };
}

// ── Activar usuario inactivo ──────────────────────────────────────────────

export async function activateUser(
  userId: string
): Promise<{ success?: boolean; message?: string }> {
  const currentRole = await getActionRole();
  if (!currentRole || !ALLOWED_USER_MGMT.includes(currentRole)) return { message: "Sin permisos." };

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ status: "activo", deleted_at: null })
    .eq("id", userId);

  if (profileError) {
    console.error("[activateUser] profile:", profileError.message);
    return { message: "No se pudo activar el usuario. Intenta nuevamente." };
  }

  await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });

  revalidatePath("/dashboard/users", "layout");
  return { success: true };
}

// ── Importar usuarios desde CSV ───────────────────────────────────────────

export type ImportResult = {
  total: number;
  created: number;
  failed: { row: number; email: string; reason: string }[];
};

export async function importUsers(
  formData: FormData
): Promise<{ success?: boolean; message?: string; result?: ImportResult }> {
  const currentRole = await getActionRole();
  if (!currentRole || !ALLOWED_USER_MGMT.includes(currentRole)) return { message: "Sin permisos." };

  const file = formData.get("file") as File | null;
  if (!file) return { message: "No se recibió ningún archivo." };

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { message: "El archivo está vacío o solo tiene el encabezado." };

  // Detectar delimitador automáticamente desde el encabezado
  const header = lines[0];
  const delimiter = header.includes("\t") ? "\t" : header.includes(";") ? ";" : ",";

  const rows = lines.slice(1); // saltar encabezado
  const result: ImportResult = { total: rows.length, created: 0, failed: [] };

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
    const [full_name, email, password, role] = cols;
    const rowNum = i + 2;

    if (!full_name || !email || !password || !role) {
      result.failed.push({ row: rowNum, email: email ?? "—", reason: "Faltan campos obligatorios." });
      continue;
    }

    if (!["docente", "alumno", "colaborador"].includes(role)) {
      result.failed.push({ row: rowNum, email, reason: `Rol inválido: "${role}".` });
      continue;
    }

    if (password.length < 8) {
      result.failed.push({ row: rowNum, email, reason: "La contraseña debe tener al menos 8 caracteres." });
      continue;
    }

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (error) {
      const reason =
        error.code === "email_exists" || error.code === "user_already_exists"
          ? "El correo ya está registrado."
          : error.message;
      result.failed.push({ row: rowNum, email, reason });
    } else {
      result.created++;
    }
  }

  revalidatePath(USERS_PATH);
  return { success: true, result };
}

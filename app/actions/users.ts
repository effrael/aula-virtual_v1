"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionRole } from "@/lib/auth-guard";
import { sendWelcomeEmail, sendPasswordResetEmail } from "@/lib/email";

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
  nombre: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }).trim(),
  apellidos: z.string().min(2, { message: "Los apellidos deben tener al menos 2 caracteres." }).trim(),
  email: z.email({ message: "Ingresa un correo electrónico válido." }).trim(),
  dni: z.string().min(1, { message: "El DNI es obligatorio." }).max(15, { message: "El DNI no puede tener más de 15 caracteres." }).trim(),
});

export type UpdateUserState =
  | { errors?: { nombre?: string[]; apellidos?: string[]; email?: string[]; dni?: string[] }; message?: string; success?: boolean }
  | undefined;

export async function updateUser(
  userId: string,
  _prev: UpdateUserState,
  formData: FormData
): Promise<UpdateUserState> {
  const role = await getActionRole();
  if (!role || !ALLOWED_USER_MGMT.includes(role)) return { message: "Sin permisos." };

  const parsed = UpdateUserSchema.safeParse({
    nombre: formData.get("nombre"),
    apellidos: formData.get("apellidos"),
    email: formData.get("email"),
    dni: formData.get("dni"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { nombre, apellidos, email, dni } = parsed.data;
  const full_name = `${nombre} ${apellidos}`;

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { email, user_metadata: { full_name, nombre, apellidos, dni } }
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
    .update({ full_name, apellidos, dni })
    .eq("id", userId);

  if (profileError) {
    console.error("[updateUser] profile:", profileError.message);
    return { message: "Datos actualizados en auth pero falló en profiles." };
  }

  revalidatePath("/dashboard/users");
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
  nombre: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }).trim(),
  apellidos: z.string().min(2, { message: "Los apellidos deben tener al menos 2 caracteres." }).trim(),
  email: z.email({ message: "Ingresa un correo electrónico válido." }).trim(),
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }).trim(),
  role: z.enum(["docente", "alumno", "colaborador"], { message: "Selecciona un rol válido." }),
  dni: z.string().min(1, { message: "El DNI es obligatorio." }).max(15, { message: "El DNI no puede tener más de 15 caracteres." }).trim(),
});

export type CreateUserState =
  | {
      errors?: {
        nombre?: string[];
        apellidos?: string[];
        email?: string[];
        password?: string[];
        role?: string[];
        dni?: string[];
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
    nombre: formData.get("nombre"),
    apellidos: formData.get("apellidos"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    dni: formData.get("dni") || undefined,
  };
  console.log("[createUser] raw fields:", raw);

  const parsed = CreateUserSchema.safeParse(raw);

  if (!parsed.success) {
    console.log("[createUser] validation errors:", parsed.error.flatten().fieldErrors);
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { nombre, apellidos, email, password, role, dni } = parsed.data;
  const full_name = `${nombre} ${apellidos}`;

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, nombre, apellidos, dni, role },
  });

  if (error) {
    console.error("[createUser]", { code: error.code, status: error.status, message: error.message });

    // Si el email ya existe, verificar si es un usuario soft-deleted y reactivarlo
    if (error.code === "email_exists" || error.code === "user_already_exists") {
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const existing = listData?.users.find((u) => u.email === email);

      if (existing) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("deleted_at")
          .eq("id", existing.id)
          .single();

        if (profile?.deleted_at) {
          // Reactivar usuario eliminado con los nuevos datos
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password,
            ban_duration: "none",
            user_metadata: { full_name, nombre, apellidos, dni, role },
          });
          await supabaseAdmin
            .from("profiles")
            .update({ full_name, apellidos, dni: dni ?? null, role, status: "activo", deleted_at: null })
            .eq("id", existing.id);

          try {
            await sendWelcomeEmail({ to: email, full_name, password, role });
          } catch (emailError) {
            console.error("[createUser] email (reactivate):", emailError);
          }

          revalidatePath(USERS_PATH);
          return { success: true };
        }
      }

      return { message: "Este correo ya está registrado en la plataforma." };
    }

    const errorMessages: Record<string, string> = {
      invalid_email: "El correo electrónico no tiene un formato válido.",
      weak_password: "La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.",
    };
    return { message: errorMessages[error.code ?? ""] ?? "Ocurrió un error inesperado. Intenta nuevamente." };
  }

  try {
    await sendWelcomeEmail({ to: email, full_name, password, role });
  } catch (emailError) {
    console.error("[createUser] email:", emailError);
    // El usuario fue creado; el fallo de email no revierte la operación
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
    const [nombre, apellidos, email, password, role, dni] = cols;
    const full_name = nombre && apellidos ? `${nombre} ${apellidos}` : (nombre ?? "");
    const rowNum = i + 2;

    if (!nombre || !apellidos || !email || !password || !role || !dni) {
      result.failed.push({ row: rowNum, email: email ?? "—", reason: "Faltan campos obligatorios (nombre, apellidos, email, password, role, dni)." });
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
      user_metadata: { full_name, nombre, apellidos, dni: dni ?? null, role },
    });

    if (error) {
      if (error.code === "email_exists" || error.code === "user_already_exists") {
        // Intentar reactivar si es soft-deleted
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const existing = listData?.users.find((u) => u.email === email);

        if (existing) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("deleted_at")
            .eq("id", existing.id)
            .single();

          if (profile?.deleted_at) {
            await supabaseAdmin.auth.admin.updateUserById(existing.id, {
              password,
              ban_duration: "none",
              user_metadata: { full_name, nombre, apellidos, dni: dni ?? null, role },
            });
            await supabaseAdmin
              .from("profiles")
              .update({ full_name, apellidos, dni: dni ?? null, role, status: "activo", deleted_at: null })
              .eq("id", existing.id);

            result.created++;
            try {
              await sendWelcomeEmail({ to: email, full_name, password, role });
            } catch (emailError) {
              console.error(`[importUsers] email (reactivate) row ${rowNum}:`, emailError);
            }
            continue;
          }
        }

        result.failed.push({ row: rowNum, email, reason: "El correo ya está registrado." });
      } else {
        result.failed.push({ row: rowNum, email, reason: error.message });
      }
    } else {
      result.created++;
      try {
        await sendWelcomeEmail({ to: email, full_name, password, role });
      } catch (emailError) {
        console.error(`[importUsers] email row ${rowNum}:`, emailError);
      }
    }
  }

  revalidatePath(USERS_PATH);
  return { success: true, result };
}

// ── Recuperación de contraseña iniciada por el propio usuario ────────────

export async function requestPasswordReset(
  email: string
): Promise<{ success?: boolean; message?: string }> {
  const redirectTo = `${process.env.NEXT_PUBLIC_URL_APP}/auth/callback?type=recovery`;

  // Buscar usuario por email para obtener nombre
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const existing = listData?.users.find((u) => u.email === email);

  if (!existing) {
    // No revelar si el email existe o no
    return { success: true };
  }

  const full_name = existing.user_metadata?.full_name ?? "Usuario";

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("[requestPasswordReset] generateLink:", linkError?.message);
    return { success: true }; // no revelar error al usuario
  }

  try {
    await sendPasswordResetEmail({ to: email, full_name, link: linkData.properties.action_link });
  } catch (emailError) {
    console.error("[requestPasswordReset] email:", emailError);
  }

  return { success: true };
}

// ── Enviar link de recuperación de contraseña ─────────────────────────────

export async function sendPasswordReset(
  userId: string
): Promise<{ success?: boolean; message?: string }> {
  const callerRole = await getActionRole();
  if (!callerRole || !ALLOWED_USER_MGMT.includes(callerRole)) return { message: "Sin permisos." };

  // Obtener email y nombre del usuario
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (authError || !authUser.user) return { message: "Usuario no encontrado." };

  const email = authUser.user.email;
  const full_name = authUser.user.user_metadata?.full_name ?? "Usuario";
  if (!email) return { message: "El usuario no tiene correo registrado." };

  // Generar link de recuperación
  const redirectTo = `${process.env.NEXT_PUBLIC_URL_APP}/auth/callback?type=recovery`;
  // redirects to /nueva-contrasena after exchanging the code
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("[sendPasswordReset] generateLink:", linkError?.message);
    return { message: "No se pudo generar el link de recuperación." };
  }

  try {
    await sendPasswordResetEmail({ to: email, full_name, link: linkData.properties.action_link });
  } catch (emailError) {
    console.error("[sendPasswordReset] email:", emailError);
    return { message: "No se pudo enviar el correo de recuperación." };
  }

  return { success: true };
}

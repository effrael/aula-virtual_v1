"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const SignupSchema = z.object({
  full_name: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres." })
    .trim(),
  email: z.email({ message: "Ingresa un correo electrónico válido." }).trim(),
  password: z
    .string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
    .regex(/[a-zA-Z]/, { message: "Debe contener al menos una letra." })
    .regex(/[0-9]/, { message: "Debe contener al menos un número." })
    .trim(),
});

export type SignupState =
  | {
      errors?: {
        full_name?: string[];
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export type LoginState = { message?: string } | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { message: "Correo o contraseña incorrectos." };

  redirect("/dashboard");
}

export async function createSuperadmin(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const supabase = await createClient();

  // Verificación server-side: si ya existe superadmin, abortar
  const { data: exists } = await supabase.rpc("superadmin_exists");
  if (exists) redirect("/login");

  const raw = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = SignupSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { full_name, email, password } = parsed.data;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, role: "superadmin" },
    },
  });

  if (error) return { message: error.message };

  redirect("/login?setup=done");
}

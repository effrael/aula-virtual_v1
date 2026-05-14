"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreateCourseSchema = z.object({
  title: z
    .string()
    .min(3, { message: "El título debe tener al menos 3 caracteres." })
    .trim(),
  description: z.string().trim().optional(),
  teacher_id: z.string().uuid({ message: "Selecciona un docente válido." }),
  cover_url: z.string().url().optional().or(z.literal("")),
});

export type CreateCourseState =
  | {
      errors?: {
        title?: string[];
        description?: string[];
        teacher_id?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;

export async function createCourse(
  _prev: CreateCourseState,
  formData: FormData
): Promise<CreateCourseState> {
  const parsed = CreateCourseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    teacher_id: formData.get("teacher_id"),
    cover_url: formData.get("cover_url"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { title, description, teacher_id, cover_url } = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase.from("courses").insert({
    title,
    description: description || null,
    teacher_id,
    cover_url: cover_url || null,
    status: "borrador",
  });

  if (error) {
    console.error("[createCourse]", error.message);
    return { message: "No se pudo crear el curso. Intenta nuevamente." };
  }

  revalidatePath("/dashboard/courses");
  return { success: true };
}

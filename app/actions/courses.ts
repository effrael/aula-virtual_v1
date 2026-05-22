"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ── Shared result type ───────────────────────────────────────────────────────

export type CourseActionResult = { success?: boolean; message?: string } | undefined;

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

// ── updateCourse ─────────────────────────────────────────────────────────────

const UpdateCourseSchema = z.object({
  id: z.string().uuid(),
  title: z
    .string()
    .min(3, { message: "El título debe tener al menos 3 caracteres." })
    .trim(),
  description: z.string().trim().optional(),
  teacher_id: z.string().uuid({ message: "Selecciona un docente válido." }),
  cover_url: z.string().url().optional().or(z.literal("")),
});

export type UpdateCourseState =
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

export async function updateCourse(
  _prev: UpdateCourseState,
  formData: FormData
): Promise<UpdateCourseState> {
  const parsed = UpdateCourseSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description"),
    teacher_id: formData.get("teacher_id"),
    cover_url: formData.get("cover_url"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { id, title, description, teacher_id, cover_url } = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase
    .from("courses")
    .update({
      title,
      description: description || null,
      teacher_id,
      cover_url: cover_url || null,
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    console.error("[updateCourse]", error.message);
    return { message: "No se pudo actualizar el curso. Intenta nuevamente." };
  }

  revalidatePath("/dashboard/courses");
  return { success: true };
}

// ── updateCourseStatus ───────────────────────────────────────────────────────

export async function updateCourseStatus(
  id: string,
  status: "borrador" | "publicado" | "archivado"
): Promise<CourseActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("courses")
    .update({ status })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    console.error("[updateCourseStatus]", error.message);
    return { message: "No se pudo actualizar el estado del curso." };
  }

  revalidatePath("/dashboard/courses");
  return { success: true };
}

// ── deleteCourse (soft delete) ───────────────────────────────────────────────

export async function deleteCourse(id: string): Promise<CourseActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("courses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[deleteCourse]", error.message);
    return { message: "No se pudo eliminar el curso." };
  }

  revalidatePath("/dashboard/courses");
  return { success: true };
}

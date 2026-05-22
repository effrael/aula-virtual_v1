"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ── Shared ────────────────────────────────────────────────────────────────────

export type ModuleActionResult =
  | { success?: boolean; message?: string }
  | undefined;

function revalidateCourse(courseId: string) {
  revalidatePath(`/dashboard/courses/${courseId}`);
}

// ── createModule ──────────────────────────────────────────────────────────────

const CreateModuleSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1, { message: "El título es requerido." }).trim(),
});

export type CreateModuleState =
  | { errors?: { title?: string[] }; message?: string; success?: boolean }
  | undefined;

export async function createModule(
  _prev: CreateModuleState,
  formData: FormData
): Promise<CreateModuleState> {
  const parsed = CreateModuleSchema.safeParse({
    course_id: formData.get("course_id"),
    title: formData.get("title"),
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { course_id, title } = parsed.data;
  const supabase = supabaseAdmin;

  const { data: last } = await supabase
    .from("modules")
    .select("position")
    .eq("course_id", course_id)
    .order("position", { ascending: false })
    .limit(1);

  const position = last?.[0]?.position != null ? last[0].position + 1 : 0;

  const { error } = await supabase
    .from("modules")
    .insert({ course_id, title, position });

  if (error) {
    console.error("[createModule]", error.message);
    return { message: "No se pudo crear el módulo." };
  }

  revalidateCourse(course_id);
  return { success: true };
}

// ── updateModule ──────────────────────────────────────────────────────────────

const UpdateModuleSchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  title: z.string().min(1, { message: "El título es requerido." }).trim(),
});

export type UpdateModuleState =
  | { errors?: { title?: string[] }; message?: string; success?: boolean }
  | undefined;

export async function updateModule(
  _prev: UpdateModuleState,
  formData: FormData
): Promise<UpdateModuleState> {
  const parsed = UpdateModuleSchema.safeParse({
    id: formData.get("id"),
    course_id: formData.get("course_id"),
    title: formData.get("title"),
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { id, course_id, title } = parsed.data;
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from("modules")
    .update({ title })
    .eq("id", id);

  if (error) {
    console.error("[updateModule]", error.message);
    return { message: "No se pudo actualizar el módulo." };
  }

  revalidateCourse(course_id);
  return { success: true };
}

// ── toggleModuleStatus ────────────────────────────────────────────────────────

export async function toggleModuleStatus(
  id: string,
  courseId: string,
  isActive: boolean
): Promise<ModuleActionResult> {
  const { error } = await supabaseAdmin
    .from("modules")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    console.error("[toggleModuleStatus]", error.message);
    return { message: "No se pudo actualizar el estado del módulo." };
  }

  revalidateCourse(courseId);
  return { success: true };
}

// ── deleteModule ──────────────────────────────────────────────────────────────

export async function deleteModule(
  id: string,
  courseId: string
): Promise<ModuleActionResult> {
  const supabase = supabaseAdmin;

  const { error } = await supabase.from("modules").delete().eq("id", id);

  if (error) {
    console.error("[deleteModule]", error.message);
    return { message: "No se pudo eliminar el módulo." };
  }

  revalidateCourse(courseId);
  return { success: true };
}

// ── createLesson ──────────────────────────────────────────────────────────────

const CreateLessonSchema = z.discriminatedUnion("type", [
  z.object({
    module_id: z.string().uuid(),
    course_id: z.string().uuid(),
    title: z.string().min(1, { message: "El título es requerido." }).trim(),
    description: z.string().trim().optional(),
    type: z.literal("video"),
    video_id: z.string().uuid({ message: "Selecciona un video." }),
  }),
  z.object({
    module_id: z.string().uuid(),
    course_id: z.string().uuid(),
    title: z.string().min(1, { message: "El título es requerido." }).trim(),
    description: z.string().trim().optional(),
    type: z.literal("link"),
    external_url: z.string().url({ message: "Ingresa una URL válida." }),
  }),
  z.object({
    module_id: z.string().uuid(),
    course_id: z.string().uuid(),
    title: z.string().min(1, { message: "El título es requerido." }).trim(),
    description: z.string().trim().optional(),
    type: z.literal("quiz"),
  }),
]);

export type CreateLessonState =
  | {
      errors?: {
        title?: string[];
        video_id?: string[];
        external_url?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;

export async function createLesson(
  _prev: CreateLessonState,
  formData: FormData
): Promise<CreateLessonState> {
  const type = formData.get("type") as "video" | "link" | "quiz";

  const parsed = CreateLessonSchema.safeParse({
    module_id: formData.get("module_id"),
    course_id: formData.get("course_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type,
    ...(type === "video"
      ? { video_id: formData.get("video_id") }
      : type === "link"
      ? { external_url: formData.get("external_url") }
      : {}),
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { module_id, course_id, title, description, type: t } = parsed.data;
  const supabase = supabaseAdmin;

  const { data: last } = await supabase
    .from("lessons")
    .select("position")
    .eq("module_id", module_id)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1);

  const position = last?.[0]?.position != null ? last[0].position + 1 : 0;

  const { data: inserted, error } = await supabase
    .from("lessons")
    .insert({
      module_id,
      title,
      description: description || null,
      position,
      type: t,
      video_id: t === "video" ? (parsed.data as any).video_id : null,
      external_url: t === "link" ? (parsed.data as any).external_url : null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[createLesson]", error?.message);
    return { message: "No se pudo crear la lección." };
  }

  // Auto-crear fila en quizzes para lecciones de tipo quiz
  if (t === "quiz") {
    await supabase.from("quizzes").insert({ lesson_id: inserted.id });
  }

  revalidateCourse(course_id);
  return { success: true };
}

// ── updateLesson ──────────────────────────────────────────────────────────────

const UpdateLessonSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().uuid(),
    course_id: z.string().uuid(),
    title: z.string().min(1, { message: "El título es requerido." }).trim(),
    description: z.string().trim().optional(),
    type: z.literal("video"),
    video_id: z.string().uuid({ message: "Selecciona un video." }),
  }),
  z.object({
    id: z.string().uuid(),
    course_id: z.string().uuid(),
    title: z.string().min(1, { message: "El título es requerido." }).trim(),
    description: z.string().trim().optional(),
    type: z.literal("link"),
    external_url: z.string().url({ message: "Ingresa una URL válida." }),
  }),
  z.object({
    id: z.string().uuid(),
    course_id: z.string().uuid(),
    title: z.string().min(1, { message: "El título es requerido." }).trim(),
    description: z.string().trim().optional(),
    type: z.literal("quiz"),
  }),
]);

export type UpdateLessonState =
  | {
      errors?: {
        title?: string[];
        video_id?: string[];
        external_url?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;

export async function updateLesson(
  _prev: UpdateLessonState,
  formData: FormData
): Promise<UpdateLessonState> {
  const type = formData.get("type") as "video" | "link" | "quiz";

  const parsed = UpdateLessonSchema.safeParse({
    id: formData.get("id"),
    course_id: formData.get("course_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type,
    ...(type === "video"
      ? { video_id: formData.get("video_id") }
      : type === "link"
      ? { external_url: formData.get("external_url") }
      : {}),
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { id, course_id, title, description, type: t } = parsed.data;
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from("lessons")
    .update({
      title,
      description: description || null,
      type: t,
      video_id: t === "video" ? (parsed.data as any).video_id : null,
      external_url: t === "link" ? (parsed.data as any).external_url : null,
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    console.error("[updateLesson]", error.message);
    return { message: "No se pudo actualizar la lección." };
  }

  revalidateCourse(course_id);
  return { success: true };
}

// ── deleteLesson (soft delete) ────────────────────────────────────────────────

export async function deleteLesson(
  id: string,
  courseId: string
): Promise<ModuleActionResult> {
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from("lessons")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[deleteLesson]", error.message);
    return { message: "No se pudo eliminar la lección." };
  }

  revalidateCourse(courseId);
  return { success: true };
}

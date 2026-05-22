"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type ResourceRow = {
  id: string;
  name: string;
  file_url: string;
  mimetype: string;
  file_size: number | null;
  position: number;
};

export type ResourceActionResult =
  | { success?: boolean; message?: string }
  | undefined;

// ── getLessonResources ────────────────────────────────────────────────────────

export async function getLessonResources(lessonId: string): Promise<ResourceRow[]> {
  const { data, error } = await supabaseAdmin
    .from("lesson_resources")
    .select("id, name, file_url, mimetype, file_size, position")
    .eq("lesson_id", lessonId)
    .order("position");

  if (error || !data) {
    console.error("[getLessonResources]", error?.message);
    return [];
  }

  return data as ResourceRow[];
}

// ── addLessonResource ─────────────────────────────────────────────────────────
// Llamada imperativa (useTransition), no useActionState — evita RSC re-stream.

export async function addLessonResource(
  lessonId: string,
  courseId: string,
  name: string,
  fileUrl: string,
): Promise<ResourceActionResult> {
  if (!name.trim()) return { message: "El nombre es requerido." };
  if (!fileUrl) return { message: "Selecciona un archivo." };

  const { data: last } = await supabaseAdmin
    .from("lesson_resources")
    .select("position")
    .eq("lesson_id", lessonId)
    .order("position", { ascending: false })
    .limit(1);

  const position = last?.[0]?.position != null ? last[0].position + 1 : 0;

  const { error } = await supabaseAdmin.from("lesson_resources").insert({
    lesson_id: lessonId,
    name: name.trim(),
    file_url: fileUrl,
    mimetype: "application/octet-stream",
    file_size: null,
    position,
  });

  if (error) {
    console.error("[addLessonResource]", error.message);
    return { message: "No se pudo adjuntar el recurso." };
  }

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { success: true };
}

// ── removeLessonResource ──────────────────────────────────────────────────────

export async function removeLessonResource(
  id: string,
  courseId: string
): Promise<ResourceActionResult> {
  const { error } = await supabaseAdmin
    .from("lesson_resources")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[removeLessonResource]", error.message);
    return { message: "No se pudo eliminar el recurso." };
  }

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { success: true };
}

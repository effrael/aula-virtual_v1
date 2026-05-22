"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type CommentRow = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  body: string;
  created_at: string;
};

export type CommentActionResult =
  | { success?: boolean; message?: string }
  | undefined;

// ── getLessonComments ─────────────────────────────────────────────────────────
// Server function — llamada desde client components (fetch on open)

export async function getLessonComments(lessonId: string): Promise<CommentRow[]> {
  const { data, error } = await supabaseAdmin
    .from("lesson_comments")
    .select(
      `
      id,
      author_id,
      body,
      created_at,
      author:profiles!author_id(full_name, role)
    `
    )
    .eq("lesson_id", lessonId)
    .is("parent_id", null)   // solo comentarios raíz (sin respuestas por ahora)
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("[getLessonComments]", error?.message);
    return [];
  }

  return data.map((c) => {
    const author = c.author as { full_name: string; role: string } | null;
    return {
      id: c.id,
      author_id: c.author_id,
      author_name: author?.full_name ?? "—",
      author_role: author?.role ?? "",
      body: c.body,
      created_at: c.created_at,
    };
  });
}

// ── addLessonComment ──────────────────────────────────────────────────────────

const AddSchema = z.object({
  lesson_id: z.string().uuid(),
  course_id: z.string().uuid(),
  body: z.string().min(1, { message: "El comentario no puede estar vacío." }).trim(),
});

export type AddCommentState =
  | { errors?: { body?: string[] }; message?: string; success?: boolean }
  | undefined;

export async function addLessonComment(
  _prev: AddCommentState,
  formData: FormData
): Promise<AddCommentState> {
  const parsed = AddSchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    course_id: formData.get("course_id"),
    body: formData.get("body"),
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { lesson_id, course_id, body } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { message: "No autenticado." };

  const { error } = await supabaseAdmin.from("lesson_comments").insert({
    lesson_id,
    author_id: user.id,
    body,
  });

  if (error) {
    console.error("[addLessonComment]", error.message);
    return { message: "No se pudo publicar el comentario." };
  }

  revalidatePath(`/dashboard/courses/${course_id}`);
  return { success: true };
}

// ── deleteLessonComment ───────────────────────────────────────────────────────

export async function deleteLessonComment(
  id: string,
  courseId: string
): Promise<CommentActionResult> {
  const { error } = await supabaseAdmin
    .from("lesson_comments")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteLessonComment]", error.message);
    return { message: "No se pudo eliminar el comentario." };
  }

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { success: true };
}

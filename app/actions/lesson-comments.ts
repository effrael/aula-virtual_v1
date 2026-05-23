"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CommentRow = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  replies: CommentRow[];
};

export type CommentActionResult =
  | { success?: boolean; message?: string }
  | undefined;

// ── getLessonComments ─────────────────────────────────────────────────────────

export async function getLessonComments(lessonId: string): Promise<CommentRow[]> {
  const { data, error } = await supabaseAdmin
    .from("lesson_comments")
    .select(`
      id,
      author_id,
      parent_id,
      body,
      created_at,
      author:profiles!author_id(full_name, role)
    `)
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("[getLessonComments]", error?.message);
    return [];
  }

  const flat: CommentRow[] = (data as any[]).map((c) => {
    const author = c.author as { full_name: string; role: string } | null;
    return {
      id: c.id,
      author_id: c.author_id,
      author_name: author?.full_name ?? "—",
      author_role: author?.role ?? "",
      parent_id: c.parent_id ?? null,
      body: c.body,
      created_at: c.created_at,
      replies: [],
    };
  });

  // Build tree (one level deep)
  const rootMap = new Map<string, CommentRow>();
  const roots: CommentRow[] = [];

  for (const c of flat) {
    if (!c.parent_id) {
      rootMap.set(c.id, c);
      roots.push(c);
    }
  }
  for (const c of flat) {
    if (c.parent_id) {
      rootMap.get(c.parent_id)?.replies.push(c);
    }
  }

  return roots;
}

// ── postLessonComment ─────────────────────────────────────────────────────────
// Función imperativa (useTransition) — devuelve el comentario creado.

export async function postLessonComment(
  lessonId: string,
  body: string,
  parentId?: string | null,
): Promise<{ success: true; comment: CommentRow } | { success: false; message: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { success: false, message: "El comentario no puede estar vacío." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado." };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const { data, error } = await supabaseAdmin
    .from("lesson_comments")
    .insert({
      lesson_id: lessonId,
      author_id: user.id,
      parent_id: parentId ?? null,
      body: trimmed,
    })
    .select("id, author_id, parent_id, body, created_at")
    .single();

  if (error || !data) {
    console.error("[postLessonComment]", error?.message);
    return { success: false, message: "No se pudo publicar el comentario." };
  }

  return {
    success: true,
    comment: {
      id: data.id,
      author_id: data.author_id,
      author_name: (profile as { full_name: string } | null)?.full_name ?? "Tú",
      author_role: (profile as { role: string } | null)?.role ?? "",
      parent_id: data.parent_id ?? null,
      body: data.body,
      created_at: data.created_at,
      replies: [],
    },
  };
}

// ── addLessonComment (useActionState) ────────────────────────────────────────
// Usado por el panel de admin (lesson-comments-dialog.tsx).

export type AddCommentState =
  | { errors?: { body?: string[] }; message?: string; success?: boolean }
  | undefined;

export async function addLessonComment(
  _prev: AddCommentState,
  formData: FormData,
): Promise<AddCommentState> {
  const lesson_id = formData.get("lesson_id") as string | null;
  const course_id = formData.get("course_id") as string | null;
  const body      = (formData.get("body") as string | null)?.trim();

  if (!body) return { errors: { body: ["El comentario no puede estar vacío."] } };
  if (!lesson_id) return { message: "Lección no especificada." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  if (course_id) revalidatePath(`/dashboard/courses/${course_id}`);
  return { success: true };
}

// ── deleteLessonComment ───────────────────────────────────────────────────────

export async function deleteLessonComment(
  id: string,
  courseId: string,
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

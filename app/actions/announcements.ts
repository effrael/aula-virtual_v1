"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AnnouncementType } from "@/lib/queries/announcements";
import { getActionRole } from "@/lib/auth-guard";

const REVALIDATE = "/dashboard/ads";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AnnouncementFormState =
  | {
      errors?: {
        title?: string[];
        content?: string[];
        target_type?: string[];
        channels?: string[];
        send_at?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;

// ── Schema ────────────────────────────────────────────────────────────────────

const AnnouncementSchema = z.object({
  title: z
    .string()
    .min(1, "El título es obligatorio.")
    .max(150, "El título no puede superar 150 caracteres."),
  content: z.string().min(1, "El contenido es obligatorio."),
  type: z.enum(["informativo", "urgente", "recordatorio"]),
  target_type: z.enum(["todos", "alumnos", "docentes", "curso"]),
  target_course_id: z.string().uuid().nullable().optional(),
  channel_platform: z.boolean(),
  channel_email: z.boolean(),
  intent: z.enum(["borrador", "enviar", "programar"]),
  send_at: z.string().nullable().optional(),
  banner_url: z.string().url().nullable().optional().or(z.literal("")),
  banner_link: z.string().url().nullable().optional().or(z.literal("")),
  cta_text: z.string().max(80).nullable().optional(),
  cta_url: z.string().url().nullable().optional().or(z.literal("")),
});

// ── saveAnnouncement ──────────────────────────────────────────────────────────

export async function saveAnnouncement(
  _prev: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  const actionRole = await getActionRole();
  if (!actionRole || actionRole === "alumno") return { message: "Sin permisos." };

  const id = formData.get("id") as string | null;

  const parsed = AnnouncementSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    type: formData.get("type"),
    target_type: formData.get("target_type"),
    target_course_id: formData.get("target_course_id") || null,
    channel_platform: formData.get("channel_platform") === "true",
    channel_email: formData.get("channel_email") === "true",
    intent: formData.get("intent"),
    send_at: formData.get("send_at") || null,
    banner_url: formData.get("banner_url") || null,
    banner_link: formData.get("banner_link") || null,
    cta_text: formData.get("cta_text") || null,
    cta_url: formData.get("cta_url") || null,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const {
    title,
    content,
    type,
    target_type,
    target_course_id,
    channel_platform,
    channel_email,
    intent,
    send_at,
    banner_url,
    banner_link,
    cta_text,
    cta_url,
  } = parsed.data;

  if (!channel_platform && !channel_email) {
    return { errors: { channels: ["Debes seleccionar al menos un canal."] } };
  }

  if (target_type === "curso" && !target_course_id) {
    return { errors: { target_type: ["Selecciona un curso."] } };
  }

  if (intent === "programar" && (!send_at || new Date(send_at) <= new Date())) {
    return { errors: { send_at: ["La fecha programada debe ser futura."] } };
  }

  const now = new Date().toISOString();
  let status: string;
  let sentAt: string | null = null;
  let scheduledAt: string | null = null;

  if (intent === "enviar") {
    status = "enviado";
    sentAt = now;
  } else if (intent === "programar") {
    status = "programado";
    scheduledAt = send_at!;
  } else {
    status = "borrador";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    title,
    content,
    type,
    status,
    target_type,
    target_course_id: target_type === "curso" ? (target_course_id ?? null) : null,
    channel_platform,
    channel_email,
    send_at: scheduledAt,
    sent_at: sentAt,
    banner_url: banner_url || null,
    banner_link: banner_link || null,
    cta_text: cta_text || null,
    cta_url: cta_url || null,
    updated_at: now,
  };

  let error;
  if (id) {
    ({ error } = await supabaseAdmin.from("announcements").update(payload).eq("id", id));
  } else {
    ({ error } = await supabaseAdmin
      .from("announcements")
      .insert({ ...payload, created_by: user?.id ?? null }));
  }

  if (error) {
    console.error("[saveAnnouncement]", error.message);
    return { message: "No se pudo guardar el anuncio." };
  }

  revalidatePath(REVALIDATE);
  return { success: true };
}

// ── sendAnnouncement ──────────────────────────────────────────────────────────

export async function sendAnnouncement(
  id: string
): Promise<{ success?: boolean; message?: string }> {
  const actionRole = await getActionRole();
  if (!actionRole || actionRole === "alumno") return { message: "Sin permisos." };

  const { error } = await supabaseAdmin
    .from("announcements")
    .update({ status: "enviado", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[sendAnnouncement]", error.message);
    return { message: "No se pudo enviar el anuncio." };
  }

  revalidatePath(REVALIDATE);
  return { success: true };
}

// ── archiveAnnouncement ───────────────────────────────────────────────────────

export async function archiveAnnouncement(
  id: string
): Promise<{ success?: boolean; message?: string }> {
  const actionRole = await getActionRole();
  if (!actionRole || actionRole === "alumno") return { message: "Sin permisos." };

  const { error } = await supabaseAdmin
    .from("announcements")
    .update({ status: "archivado", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[archiveAnnouncement]", error.message);
    return { message: "No se pudo archivar el anuncio." };
  }

  revalidatePath(REVALIDATE);
  return { success: true };
}

// ── deleteAnnouncement ────────────────────────────────────────────────────────

export async function deleteAnnouncement(
  id: string
): Promise<{ success?: boolean; message?: string }> {
  const actionRole = await getActionRole();
  if (!actionRole || actionRole === "alumno") return { message: "Sin permisos." };

  const { error } = await supabaseAdmin.from("announcements").delete().eq("id", id);

  if (error) {
    console.error("[deleteAnnouncement]", error.message);
    return { message: "No se pudo eliminar el anuncio." };
  }

  revalidatePath(REVALIDATE);
  return { success: true };
}

// ── duplicateAnnouncement ─────────────────────────────────────────────────────

export async function duplicateAnnouncement(
  id: string
): Promise<{ success?: boolean; message?: string }> {
  const actionRole = await getActionRole();
  if (!actionRole || actionRole === "alumno") return { message: "Sin permisos." };

  const { data: original, error: fetchError } = await supabaseAdmin
    .from("announcements")
    .select(
      "title, content, type, target_type, target_course_id, channel_platform, channel_email"
    )
    .eq("id", id)
    .single();

  if (fetchError || !original) return { message: "No se encontró el anuncio." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabaseAdmin.from("announcements").insert({
    ...original,
    title: `${original.title} (copia)`,
    status: "borrador",
    sent_at: null,
    send_at: null,
    created_by: user?.id ?? null,
  });

  if (error) {
    console.error("[duplicateAnnouncement]", error.message);
    return { message: "No se pudo duplicar el anuncio." };
  }

  revalidatePath(REVALIDATE);
  return { success: true };
}

// ── markAnnouncementRead ──────────────────────────────────────────────────────

export async function markAnnouncementRead(announcementId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabaseAdmin
    .from("announcement_reads")
    .upsert(
      { announcement_id: announcementId, user_id: user.id },
      { onConflict: "announcement_id,user_id" }
    );
}

// ── markAllAnnouncementsRead ──────────────────────────────────────────────────

export async function markAllAnnouncementsRead(announcementIds: string[]): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !announcementIds.length) return;

  await supabaseAdmin
    .from("announcement_reads")
    .upsert(
      announcementIds.map((id) => ({ announcement_id: id, user_id: user.id })),
      { onConflict: "announcement_id,user_id" }
    );
}

// ── getUnreadAnnouncementsForUser ─────────────────────────────────────────────
// Llamado como server action desde el cliente (campana de notificaciones).

export type UnreadAnnouncement = {
  id: string;
  title: string;
  type: AnnouncementType;
  content: string;
  banner_url: string | null;
  banner_link: string | null;
  cta_text: string | null;
  cta_url: string | null;
  created_at: string;
};

export async function getUnreadAnnouncementsForUser(
  userId: string,
  userRole: string
): Promise<UnreadAnnouncement[]> {
  // superadmin y admin ven todos los anuncios sin filtro de destinatario
  if (userRole === "superadmin" || userRole === "admin") {
    const { data: all } = await supabaseAdmin
      .from("announcements")
      .select("id, title, type, content, banner_url, banner_link, cta_text, cta_url, created_at")
      .eq("status", "enviado")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!all?.length) return [];

    const { data: reads } = await supabaseAdmin
      .from("announcement_reads")
      .select("announcement_id")
      .eq("user_id", userId)
      .in("announcement_id", all.map((a) => a.id));

    const readIds = new Set((reads ?? []).map((r) => r.announcement_id));
    return all
      .filter((a) => !readIds.has(a.id))
      .map((a) => ({ ...a, type: a.type as AnnouncementType, banner_url: a.banner_url ?? null, banner_link: a.banner_link ?? null, cta_text: a.cta_text ?? null, cta_url: a.cta_url ?? null }));
  }

  const roleToTarget: Record<string, string> = {
    alumno:      "alumnos",
    docente:     "docentes",
    colaborador: "docentes",
  };
  const targetTypes = ["todos"];
  if (roleToTarget[userRole]) targetTypes.push(roleToTarget[userRole]);

  const { data: announcements } = await supabaseAdmin
    .from("announcements")
    .select("id, title, type, content, banner_url, banner_link, cta_text, cta_url, created_at")
    .eq("status", "enviado")
    .in("target_type", targetTypes)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!announcements?.length) return [];

  const { data: reads } = await supabaseAdmin
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", userId)
    .in(
      "announcement_id",
      announcements.map((a) => a.id)
    );

  const readIds = new Set((reads ?? []).map((r) => r.announcement_id));

  return announcements
    .filter((a) => !readIds.has(a.id))
    .map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type as AnnouncementType,
      content: a.content,
      banner_url: a.banner_url ?? null,
      banner_link: a.banner_link ?? null,
      cta_text: a.cta_text ?? null,
      cta_url: a.cta_url ?? null,
      created_at: a.created_at,
    }));
}

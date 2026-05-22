import { supabaseAdmin } from "@/lib/supabase/admin";

export type AnnouncementType = "informativo" | "urgente" | "recordatorio";
export type AnnouncementStatus = "borrador" | "enviado" | "programado" | "archivado";
export type TargetType = "todos" | "alumnos" | "docentes" | "curso";

export type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  target_type: TargetType;
  target_course_id: string | null;
  target_course_title: string | null;
  channel_platform: boolean;
  channel_email: boolean;
  send_at: string | null;
  sent_at: string | null;
  banner_url: string | null;
  banner_link: string | null;
  cta_text: string | null;
  cta_url: string | null;
  created_by_name: string | null;
  read_count: number;
  created_at: string;
};

export async function getAnnouncements(): Promise<AnnouncementRow[]> {
  const { data, error } = await supabaseAdmin
    .from("announcements")
    .select(
      `
      id, title, content, type, status,
      target_type, target_course_id,
      channel_platform, channel_email,
      send_at, sent_at, created_at,
      banner_url, banner_link, cta_text, cta_url,
      course:courses!target_course_id(title),
      author:profiles!created_by(full_name),
      reads:announcement_reads(count)
    `
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[getAnnouncements]", error?.message);
    return [];
  }

  return data.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    type: a.type as AnnouncementType,
    status: a.status as AnnouncementStatus,
    target_type: a.target_type as TargetType,
    target_course_id: a.target_course_id ?? null,
    target_course_title: (a.course as { title: string } | null)?.title ?? null,
    channel_platform: a.channel_platform,
    channel_email: a.channel_email,
    send_at: a.send_at ?? null,
    sent_at: a.sent_at ?? null,
    banner_url: a.banner_url ?? null,
    banner_link: a.banner_link ?? null,
    cta_text: a.cta_text ?? null,
    cta_url: a.cta_url ?? null,
    created_by_name: (a.author as { full_name: string } | null)?.full_name ?? null,
    read_count: (a.reads as { count: number }[])?.[0]?.count ?? 0,
    created_at: a.created_at,
  }));
}

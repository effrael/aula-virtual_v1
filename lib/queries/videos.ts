import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatBytes } from "@/lib/utils";
import type { VideoRow } from "@/lib/storage-utils";

export type { VideoRow } from "@/lib/storage-utils";

export async function getVideos(): Promise<VideoRow[]> {
  const { data, error } = await supabaseAdmin
    .from("media_videos")
    .select("id, title, status, duration, hls_url, file_size, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[getVideos]", error?.message);
    return [];
  }

  return data.map((v) => ({
    id: v.id,
    title: v.title,
    status: v.status,
    duration: v.duration,
    hls_url: v.hls_url,
    file_size: v.file_size,
    file_size_label: v.file_size ? formatBytes(v.file_size) : "—",
    created_at: v.created_at,
  }));
}

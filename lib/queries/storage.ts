import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { StorageFile } from "@/lib/storage-utils";

export type { StorageFile } from "@/lib/storage-utils";

export async function getStorageFiles(bucket: string): Promise<StorageFile[]> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).list("", {
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error || !data) {
    console.error(`[getStorageFiles:${bucket}]`, error?.message);
    return [];
  }

  return data
    .filter((f) => f.name !== ".emptyFolderPlaceholder")
    .map((f) => ({
      name: f.name,
      size: f.metadata?.size ?? 0,
      mimetype: f.metadata?.mimetype ?? "application/octet-stream",
      created_at: f.created_at ?? "",
      publicUrl: supabaseAdmin.storage.from(bucket).getPublicUrl(f.name).data.publicUrl,
    }));
}

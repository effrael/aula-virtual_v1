"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStorageFiles } from "@/lib/queries/storage";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { LIBRARY_BUCKET } from "@/lib/storage-utils";
import type { StorageFile, VideoRow } from "@/lib/storage-utils";
import { getVideos } from "@/lib/queries/videos";

const IMAGE_WIDTH = 1280;
const IMAGE_HEIGHT = 720;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export type UploadState =
  | { publicUrl?: string; message?: string; success?: boolean }
  | undefined;

export async function listStorageFiles(bucket: string): Promise<StorageFile[]> {
  return getStorageFiles(bucket);
}

export async function uploadFile(
  bucket: string,
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { message: "Selecciona un archivo." };
  }

  const isImage = file.type.startsWith("image/");
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

  if (file.size > maxSize) {
    return { message: `El archivo no debe superar los ${isImage ? "10" : "50"} MB.` };
  }

  let uploadBuffer: Buffer;
  let contentType: string;
  let fileName: string;

  if (isImage) {
    uploadBuffer = await sharp(Buffer.from(await file.arrayBuffer()))
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toBuffer();
    contentType = "image/webp";
    fileName = `${Date.now()}.webp`;
  } else {
    uploadBuffer = Buffer.from(await file.arrayBuffer());
    contentType = file.type || "application/octet-stream";
    const ext = file.name.split(".").pop() ?? "bin";
    fileName = `${Date.now()}.${ext}`;
  }

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(fileName, uploadBuffer, { contentType, upsert: false });

  if (error) {
    console.error("[uploadFile] bucket:", bucket, "| error:", error.message, "| status:", error.status);
    return { message: `Error al subir: ${error.message}` };
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);

  revalidatePath("/dashboard/library");
  return { success: true, publicUrl: data.publicUrl };
}

export async function listVideos(): Promise<VideoRow[]> {
  return getVideos();
}

export async function deleteStorageFile(
  bucket: string,
  fileName: string
): Promise<{ success?: boolean; message?: string }> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([fileName]);

  if (error) {
    console.error("[deleteStorageFile]", error.message);
    return { message: "No se pudo eliminar el archivo." };
  }

  revalidatePath("/dashboard/library");
  return { success: true };
}


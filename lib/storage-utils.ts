export const LIBRARY_BUCKET = "library";

export type VideoRow = {
  id: string;
  title: string;
  status: "procesando" | "listo" | "error";
  duration: number | null;
  hls_url: string | null;
  file_size: number | null;
  file_size_label: string;
  created_at: string;
};

export type FileCategory = "image" | "pdf" | "word" | "excel" | "zip" | "other";

export type StorageFile = {
  name: string;
  size: number;
  mimetype: string;
  created_at: string;
  publicUrl: string;
};

export function getFileCategory(mimetype: string): FileCategory {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype === "application/pdf") return "pdf";
  if (mimetype.includes("word") || mimetype.includes("wordprocessingml")) return "word";
  if (mimetype.includes("excel") || mimetype.includes("spreadsheetml")) return "excel";
  if (mimetype.includes("zip") || mimetype.includes("compressed")) return "zip";
  return "other";
}

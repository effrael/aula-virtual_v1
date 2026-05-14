import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { spawn } from "child_process";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { VIDEO_STORAGE_PATH, VIDEO_BASE_URL, HLS_SEGMENT_TIME } from "@/lib/video-config";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Parsea "Duration: HH:MM:SS.ms" del stderr de FFmpeg → segundos */
function parseDuration(stderr: string): number | null {
  const match = stderr.match(/Duration:\s+(\d+):(\d+):(\d+)/);
  if (!match) return null;
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
}

/**
 * Corre FFmpeg en background y actualiza la BD cuando termina.
 * No es awaited — se dispara y se olvida desde el handler.
 */
function processVideo(
  videoId: string,
  inputPath: string,
  outputDir: string,
  hlsUrl: string
) {
  const outputPlaylist = path.join(outputDir, "master.m3u8");
  const segmentPattern = path.join(outputDir, "segment_%03d.ts");

  const args = [
    "-i", inputPath,
    "-c:v", "libx264",
    "-crf", "22",
    "-preset", "fast",
    "-c:a", "aac",
    "-b:a", "128k",
    "-vf", "scale=-2:720",
    "-hls_time", String(HLS_SEGMENT_TIME),
    "-hls_playlist_type", "vod",
    "-hls_segment_filename", segmentPattern,
    outputPlaylist,
  ];

  let stderr = "";
  const ffmpeg = spawn("ffmpeg", args);

  ffmpeg.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  ffmpeg.on("close", async (code) => {
    if (code === 0) {
      const duration = parseDuration(stderr);
      console.log(`[FFmpeg] ✓ videoId=${videoId} duration=${duration}s`);
      await supabaseAdmin
        .from("media_videos")
        .update({ status: "listo", hls_url: hlsUrl, duration })
        .eq("id", videoId);
    } else {
      console.error(`[FFmpeg] ✗ videoId=${videoId} código=${code}`);
      console.error("[FFmpeg] stderr:", stderr);
      await supabaseAdmin
        .from("media_videos")
        .update({ status: "error" })
        .eq("id", videoId);
    }

    await unlink(inputPath).catch(() => null);
  });

  ffmpeg.on("error", async (err) => {
    console.error("[FFmpeg] No se pudo iniciar (¿está instalado?):", err.message);
    await supabaseAdmin
      .from("media_videos")
      .update({ status: "error" })
      .eq("id", videoId);
  });
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string | null) ?? "";

  console.log("[upload/video] file:", file?.name, "size:", file?.size, "type:", file?.type);

  if (!file || file.size === 0) {
    return NextResponse.json({ message: "Selecciona un video." }, { status: 400 });
  }

  if (!file.type.startsWith("video/")) {
    return NextResponse.json(
      { message: "Solo se permiten archivos de video (MP4, MOV, etc.)." },
      { status: 400 }
    );
  }

  const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ message: "El video no debe superar los 2 GB." }, { status: 400 });
  }

  const videoId = randomUUID();
  const outputDir = path.join(VIDEO_STORAGE_PATH, videoId);
  const ext = file.name.split(".").pop() ?? "mp4";
  const inputPath = path.join(outputDir, `input.${ext}`);
  const hlsUrl = `${VIDEO_BASE_URL}/${videoId}/master.m3u8`;

  // Crear carpeta y guardar video original
  await mkdir(outputDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  console.log("[upload/video] buffer size:", buffer.length, "outputDir:", outputDir);
  await writeFile(inputPath, buffer);

  // Registrar en BD
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error: dbError } = await supabaseAdmin.from("media_videos").insert({
    id: videoId,
    title: title || file.name.replace(/\.[^/.]+$/, ""),
    status: "procesando",
    file_size: file.size,
    uploaded_by: user?.id ?? null,
  });

  if (dbError) {
    console.error("[upload/video]", dbError.message);
    return NextResponse.json(
      { message: "Error al registrar el video." },
      { status: 500 }
    );
  }

  // Disparar FFmpeg en background (no bloqueante)
  processVideo(videoId, inputPath, outputDir, hlsUrl);

  return NextResponse.json({ success: true, videoId, status: "procesando" });
}

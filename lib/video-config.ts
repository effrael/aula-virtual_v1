import path from "path";

/**
 * Dónde se guardan los archivos HLS generados por FFmpeg.
 * Local:      /proyecto/public/videos/
 * Producción: /var/videos/  (servido por Nginx)
 */
export const VIDEO_STORAGE_PATH =
  process.env.VIDEO_STORAGE_PATH ??
  (process.env.NODE_ENV === "production"
    ? "/var/videos"
    : path.join(process.cwd(), "public", "videos"));

/**
 * URL base para acceder a los videos desde el browser.
 * Local:      /videos  (Next.js sirve desde /public)
 * Producción: https://tudominio.com/videos  (Nginx)
 */
export const VIDEO_BASE_URL =
  process.env.NGINX_VIDEO_URL ?? "/videos";

/** Segundos por segmento HLS */
export const HLS_SEGMENT_TIME = 6;

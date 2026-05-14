# Aula — Videos y FFmpeg

## Contexto

Los videos NO se almacenan en Supabase Storage por razones de rendimiento y costo. Se procesan con FFmpeg en el propio servidor (VPS) y se sirven como HLS (HTTP Live Streaming), que es el mismo formato que usa YouTube, Udemy y Platzi.

El código es **idéntico en local y producción** — solo cambia dónde se guardan los archivos y quién los sirve.

---

## Por qué HLS y no MP4 directo

| | MP4 directo | HLS |
|---|---|---|
| Calidad adaptativa | ❌ | ✅ (se ajusta a la conexión) |
| Seek rápido | ❌ | ✅ (segmentos de 6s) |
| Protección descarga | ❌ | Parcial |
| Soporte navegadores | ✅ | ✅ (con hls.js) |

---

## Instalación de FFmpeg

### Local (Windows)

```bash
winget install --id Gyan.FFmpeg -e
```

Después de instalar, **abrir una nueva terminal** para que tome el PATH actualizado. Verificar:

```bash
ffmpeg -version
```

Debe mostrar `ffmpeg version 7.x.x` o similar. Si dice `command not found`, la terminal no tiene el PATH actualizado.

**Importante:** El servidor `pnpm dev` debe iniciarse desde una terminal que ya tenga FFmpeg en el PATH. Si se inicia antes de instalar FFmpeg, `spawn ffmpeg ENOENT` aparecerá en logs — reiniciar el servidor soluciona esto.

### Producción (VPS Ubuntu/Debian)

```bash
apt update && apt install -y ffmpeg
ffmpeg -version
```

---

## Configuración de rutas

```typescript
// lib/video-config.ts

// Dónde guarda FFmpeg los archivos HLS generados
VIDEO_STORAGE_PATH:
  - Local:      {proyecto}/public/videos/   (Next.js lo sirve desde /public)
  - Producción: /var/videos/                (Nginx lo sirve)

// URL base para el player en el navegador
VIDEO_BASE_URL:
  - Local:      /videos
  - Producción: https://tudominio.com/videos  (variable NGINX_VIDEO_URL)
```

### Variables de entorno

```env
# Solo necesarias en producción (en local usa defaults automáticos)
VIDEO_STORAGE_PATH=/var/videos
NGINX_VIDEO_URL=https://tudominio.com/videos
```

### Crear carpeta de videos en local

```bash
mkdir public/videos
```

Esta carpeta es servida automáticamente por Next.js en local. En producción la sirve Nginx.

---

## Flujo completo de subida de video

```
1. Usuario selecciona video en /dashboard/library
2. JS hace fetch POST /api/upload/video con FormData
   └── beforeunload activo mientras dure el fetch (protege contra recarga accidental)
3. API Route recibe el archivo:
   a. Valida tipo (video/*) y tamaño (máx 2GB)
   b. Crea carpeta: {VIDEO_STORAGE_PATH}/{videoId}/
   c. Guarda archivo original: input.mp4
   d. Inserta en media_videos con status="procesando"
   e. Dispara FFmpeg en background (spawn, no bloqueante)
   f. Retorna { success: true, videoId } al cliente
4. FFmpeg procesa en background:
   a. Convierte a H.264 + AAC
   b. Escala a 720p máximo
   c. Genera segmentos HLS de 6 segundos
   d. Crea master.m3u8
5. Al terminar FFmpeg:
   - Éxito (code 0): actualiza BD → status="listo", hls_url, duration
   - Error (code ≠ 0): actualiza BD → status="error", log completo en consola
   - Elimina el archivo original (input.mp4) para liberar espacio
6. Cliente polling cada 5s mientras haya videos en "procesando"
   └── Al detectar "listo": muestra toast y detiene polling
```

---

## API Route: `POST /api/upload/video`

```typescript
// app/api/upload/video/route.ts

// FormData esperado:
// - file: File (video/*)
// - title: string (opcional, usa nombre del archivo si no se pasa)

// Respuesta exitosa:
{ success: true, videoId: "uuid", status: "procesando" }

// Respuesta con error:
{ message: "descripción del error" }
```

---

## Comando FFmpeg utilizado

```bash
ffmpeg \
  -i input.mp4 \
  -c:v libx264 \        # codec de video
  -crf 22 \             # calidad (18=alta, 28=baja). 22 = buen balance
  -preset fast \        # velocidad de encoding (ultrafast/fast/medium/slow)
  -c:a aac \            # codec de audio
  -b:a 128k \           # bitrate de audio
  -vf "scale=-2:720" \  # escala a 720p manteniendo aspect ratio
  -hls_time 6 \         # segmentos de 6 segundos
  -hls_playlist_type vod \
  -hls_segment_filename "segment_%03d.ts" \
  master.m3u8
```

Resultado en `{VIDEO_STORAGE_PATH}/{videoId}/`:
```
master.m3u8
segment_000.ts
segment_001.ts
segment_002.ts
...
```

---

## Estructura de carpetas de video

```
public/videos/              ← local (Next.js sirve desde aquí)
/var/videos/                ← producción (Nginx sirve desde aquí)
  {videoId}/
    master.m3u8             ← playlist principal (hls_url en BD)
    segment_000.ts          ← segmento 0-6s
    segment_001.ts          ← segmento 6-12s
    ...
    (input.mp4 se elimina al terminar el encoding)
```

---

## Configuración de Nginx (producción)

```nginx
# Servir archivos HLS de video
location /videos/ {
    alias /var/videos/;
    add_header Cache-Control "public, max-age=31536000";
    add_header Access-Control-Allow-Origin *;
    types {
        application/vnd.apple.mpegurl m3u8;
        video/mp2t ts;
    }
}

# Aumentar límite para uploads de video vía Next.js
client_max_body_size 2g;
```

---

## Tabla `media_videos`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | ID del video (también es el nombre de carpeta en disco) |
| `title` | text | Nombre del video (editable) |
| `status` | text | `procesando` → `listo` → `error` |
| `duration` | int | Duración en segundos (parseada del stderr de FFmpeg) |
| `hls_url` | text | URL del `master.m3u8`. Null mientras procesa. |
| `file_size` | bigint | Bytes del archivo original |
| `uploaded_by` | uuid | FK a profiles |
| `created_at` | timestamptz | Fecha de creación |

---

## Solución de problemas comunes

### `spawn ffmpeg ENOENT`
FFmpeg no está en el PATH del proceso de Node.js.
- **Causa:** El servidor `pnpm dev` se inició antes de instalar FFmpeg, o desde una terminal sin PATH actualizado.
- **Solución:** Detener el servidor, abrir una nueva terminal, verificar `ffmpeg -version`, reiniciar `pnpm dev`.

### Archivos en blanco en `public/videos/`
El buffer llegó vacío al servidor.
- **Causa:** Límite de body size de Next.js cortando el request.
- **Solución:** Verificar `next.config.ts` tiene `experimental.serverActions.bodySizeLimit: "2gb"`.

### Status siempre "procesando" después de recargar
- **Causa:** FFmpeg falló silenciosamente.
- **Solución:** Revisar logs del servidor. El stderr completo de FFmpeg se imprime en consola cuando falla.

### Video en status "error" y no sé por qué
Buscar en los logs del servidor la línea `[FFmpeg] stderr:` — ahí está el mensaje de error completo de FFmpeg.

---

## Próximos pasos

1. Player HLS en la vista de lección (`hls.js` o `video.js`)
2. Selección de video desde `MediaPicker` en el formulario de lección
3. Eliminar video (borrar carpeta del disco + registro en BD)
4. Multi-quality HLS (360p, 480p, 720p + master playlist con múltiples streams)
5. Thumbnail automático del video (FFmpeg puede extraer un frame)

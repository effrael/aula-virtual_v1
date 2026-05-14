# Aula — Biblioteca de Medios (Library)

## Contexto

La Biblioteca de Medios es el repositorio centralizado de todos los archivos de la plataforma, similar al Media Library de WordPress. Cualquier rol excepto `alumno` puede subir archivos. Los archivos se seleccionan desde aquí al crear cursos, lecciones u otros recursos.

**Importante:** Los videos NO van a Supabase Storage — tienen su propio flujo con FFmpeg. Ver `docs/video-ffmpeg.md`.

---

## Arquitectura de almacenamiento

| Tipo | Dónde | Procesamiento |
|---|---|---|
| Imágenes (JPG, PNG, WEBP) | Supabase Storage → bucket `library` | Sharp → 1280×720 webp, quality 80 |
| PDF, Word, Excel, ZIP | Supabase Storage → bucket `library` | Sin procesamiento, sube tal cual |
| Videos (MP4, MOV, etc.) | VPS local → `public/videos/` o `/var/videos/` | FFmpeg → HLS (.m3u8) |

---

## Supabase Storage — bucket `library`

### Crear el bucket (una sola vez)

En Supabase Dashboard → Storage → New bucket:
```
Nombre:           library
Público:          ✅ (activado)
File size limit:  52428800  (50 MB)
Allowed MIME:     (vacío = acepta todo)
```

El bucket debe ser **público** porque las URLs se guardan en la BD y se sirven directamente en `<img>` sin autenticación.

---

## Base de datos — videos

### Tabla: `media_videos`

```sql
create table public.media_videos (
  id           uuid default gen_random_uuid() primary key,
  title        text not null,
  status       text default 'procesando'
               check (status in ('procesando', 'listo', 'error')),
  duration     int,           -- segundos (lo parsea FFmpeg del stderr)
  hls_url      text,          -- URL del master.m3u8 servido por Nginx/Next.js
  file_size    bigint,        -- bytes del archivo original (antes de encoding)
  uploaded_by  uuid references public.profiles(id),
  created_at   timestamptz default now()
);

alter table public.media_videos enable row level security;
```

---

## Estructura de archivos

```
app/
├── actions/
│   └── storage.ts                          # uploadFile(), deleteStorageFile(), listStorageFiles(), listVideos()
├── api/
│   └── upload/
│       └── video/
│           └── route.ts                    # API Route: recibe video, guarda en disco, dispara FFmpeg
└── dashboard/
    └── library/
        ├── page.tsx                        # Página principal (server component)
        └── _components/
            └── library-grid.tsx            # Grid interactivo con tabs (client component)

components/
└── media-picker.tsx                        # Modal reutilizable para seleccionar archivos

lib/
├── storage-utils.ts                        # Tipos y constantes compartidos (cliente + servidor)
│                                           # StorageFile, VideoRow, FileCategory, LIBRARY_BUCKET, getFileCategory()
├── video-config.ts                         # Rutas de video según entorno (local/producción)
└── queries/
    ├── storage.ts                          # getStorageFiles() — server-only
    └── videos.ts                           # getVideos() — server-only
```

---

## Regla de imports (crítica)

`lib/queries/storage.ts` y `lib/queries/videos.ts` tienen `import "server-only"` y usan `supabaseAdmin`. **Nunca importarlos desde client components.**

Los client components deben importar de:
- Tipos/constantes → `lib/storage-utils.ts`
- Funciones puras (`formatBytes`, `formatDuration`) → `lib/utils.ts`
- Server actions → `app/actions/storage.ts` (solo funciones async)

```
❌ Client component importa lib/queries/storage.ts → supabaseKey is required (error en runtime)
✅ Client component importa lib/storage-utils.ts   → seguro
✅ Client component importa app/actions/storage.ts → Next.js maneja la frontera servidor/cliente
```

En `"use server"` solo se pueden exportar `async functions`. No tipos, no constantes, no funciones síncronas.

---

## Componente `MediaPicker`

Modal reutilizable para seleccionar archivos desde la biblioteca.

```typescript
type Props = {
  bucket: string;
  value: string | null;          // URL actualmente seleccionada
  onChange: (url: string | null) => void;
  initialFiles?: StorageFile[];  // Prefetch desde el server component padre
  accept?: "image" | "all";      // "image" → filtra solo imágenes (uso en portada de curso)
};
```

**Comportamiento:**
- Al abrirse: refresca la lista de archivos desde el servidor
- Permite subir nuevos archivos directamente desde el modal
- Grid con check visual al seleccionar
- Hover: botón de eliminar por archivo
- `accept="image"` → muestra solo imágenes y acepta solo `image/*` en el input file

**Uso en portada de curso:**
```tsx
<MediaPicker
  bucket={LIBRARY_BUCKET}
  value={coverUrl}
  onChange={setCoverUrl}
  initialFiles={libraryFiles}
  accept="image"
/>
```

---

## Procesamiento de imágenes (Sharp)

Al subir una imagen al bucket `library`:

```
Imagen original (JPG/PNG/WEBP, máx 10MB)
  → Sharp resize a 1280×720 (fit: cover, centrado)
  → Convertir a WebP quality 80
  → Subir buffer al bucket como {timestamp}.webp
  → Retornar URL pública
```

Resultado: ~40-80KB por imagen, independiente del tamaño original.

---

## Límites de tamaño

| Tipo | Límite |
|---|---|
| Imágenes | 10 MB (antes de comprimir) |
| Documentos (PDF, Word, Excel, ZIP) | 50 MB |
| Videos | 2 GB |

Configurado en `next.config.ts`:
```typescript
experimental: {
  serverActions: {
    bodySizeLimit: "2gb",
  },
},
```

---

## Vista `/dashboard/library`

**Stats:** total de archivos (imágenes + docs + videos), espacio en Supabase Storage, espacio en VPS.

**Tabs dinámicos:** Solo aparecen los tabs que tienen archivos (`Todos`, `Imágenes`, `PDF`, `Word`, `Excel`, `ZIP`, `Otros`, `Videos`).

**Acciones por archivo:**
- Imágenes: hover → copiar URL, eliminar
- Documentos: hover → copiar URL, eliminar
- Videos: badge de estado (`Procesando` / `Listo` / `Error`). Si está listo: copiar URL del HLS.

**Polling de videos:** Mientras haya videos en estado `procesando`, la página consulta automáticamente cada 5 segundos. Se detiene cuando todos pasan a `listo` y muestra un toast.

**Protección de recarga:** Mientras se está subiendo un video (fetch en curso), el navegador muestra confirmación antes de recargar (`beforeunload`). Una vez subido (FFmpeg procesando en servidor), recargar es seguro — el registro ya existe en BD.

---

## Próximos pasos

1. RLS policies para el bucket `library` (restringir eliminación por rol)
2. Paginación en el grid (cuando haya muchos archivos)
3. Vista previa de PDF en el modal
4. Soporte de eliminación de videos (borrar archivos HLS del disco + registro en BD)
5. Integrar `MediaPicker` en formulario de lección para seleccionar video

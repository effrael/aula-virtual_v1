# Aula — Librería: naming al subir y renombrado de archivos

## Flujo de subida con nombre

Al seleccionar cualquier archivo (imagen, PDF, video u otro), antes de enviarlo al servidor se muestra un **dialog de nombre**:

1. Usuario selecciona archivo con `<input type="file">`
2. Se intercepta en `onChange` → se guarda `pendingUpload: { file, type }`
3. Se abre dialog pre-llenado con el nombre limpio del archivo (sin extensión, sin timestamp)
4. Usuario confirma o edita el nombre
5. El nombre se incluye en el `FormData` como campo `name`
6. Se llama `uploadFile(bucket, _prev, formData)` vía `useTransition`

### Aplica a todos los tipos:
- Imágenes / PDFs / docs → bucket `LIBRARY_BUCKET`
- Videos → tabla `media_videos` (se sube primero al bucket y luego se registra)

---

## Server action: `uploadFile` (`app/actions/storage.ts`)

Lee el campo `name` del FormData:

```ts
const customName = (formData.get("name") as string | null)?.trim();
const baseName = customName
  ? sanitizeFileName(customName)
  : sanitizeFileName(file.name.replace(/\.[^/.]+$/, ""));
```

Genera el filename final como `{baseName}_{Date.now()}.{ext}` para evitar colisiones.

### `sanitizeFileName(name: string)`

```ts
name
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")   // quitar tildes
  .toLowerCase()
  .replace(/[^a-z0-9\-_]/g, "-")     // solo alfanumérico
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "")
  .substring(0, 60) || "archivo"
```

---

## Renombrado de archivos ya subidos

Botón de lápiz en el hover overlay de cada item de la grid.

### Para archivos en Storage:

```ts
export async function renameStorageFile(
  bucket: string,
  oldPath: string,
  newName: string
): Promise<{ success?: boolean; message?: string }>
```

Usa `supabaseAdmin.storage.from(bucket).move(oldPath, newPath)` — renombra in-place sin re-subir.

El nuevo path es `{sanitizeFileName(newName)}_{Date.now()}.{ext}`.

### Para videos (`media_videos`):

```ts
export async function renameVideo(
  videoId: string,
  title: string
): Promise<{ success?: boolean; message?: string }>
```

Actualiza la columna `title` en la tabla `media_videos`.

---

## Estado del componente (`library-grid.tsx`)

```ts
// Subida pendiente (unifica docs y videos)
const [pendingUpload, setPendingUpload] = useState<{
  file: File;
  type: "doc" | "video";
} | null>(null);

// Renombrado
const [editingItem, setEditingItem] = useState<StorageFile | VideoRow | null>(null);
const [editName, setEditName] = useState("");
const [renamePending, startRenameTransition] = useTransition();
```

- Se usa `useTransition` (no `useActionState`) para la subida de docs, igual que videos
- El dialog de nombre pre-llena quitando el sufijo `_timestamp` para archivos existentes, y `video.title` para videos

---

## Revalidación

Ambas actions llaman `revalidatePath("/dashboard/library")` al completar con éxito.

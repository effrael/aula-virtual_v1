# Aula — Módulo Contenido (Módulos y Lecciones)

## Contexto

El contenido de un curso se organiza en **módulos** (secciones) que agrupan **lecciones**. Un curso con una sola sección usa un único módulo (el alumno no lo ve como tal, solo ve las lecciones). Cada lección puede ser un video interno o un enlace externo.

---

## Base de datos

### Tabla: `modules`

```sql
create table public.modules (
  id         uuid        default gen_random_uuid() primary key,
  course_id  uuid        not null references public.courses(id) on delete cascade,
  title      text        not null,
  position   int         not null default 0,
  created_at timestamptz default now()
);
```

### Tabla: `lessons`

```sql
create table public.lessons (
  id           uuid        default gen_random_uuid() primary key,
  module_id    uuid        not null references public.modules(id) on delete cascade,
  title        text        not null,
  description  text,
  position     int         not null default 0,
  type         text        not null check (type in ('video', 'link')),
  video_id     uuid        references public.media_videos(id) on delete set null,
  external_url text,
  deleted_at   timestamptz default null,
  created_at   timestamptz default now(),

  constraint lesson_video_requires_id
    check (type != 'video' or video_id is not null),
  constraint lesson_link_requires_url
    check (type != 'link' or (external_url is not null and external_url != ''))
);
```

- `type = 'video'` → referencia a `media_videos`. El constraint obliga que `video_id` no sea null.
- `type = 'link'` → URL externa (otro curso, certificación, recurso externo). `external_url` obligatorio.
- `deleted_at` → soft delete. Las queries filtran `where deleted_at is null`.

### Tabla: `lesson_resources`

Archivos descargables que el **admin/docente adjunta** a una lección.

```sql
create table public.lesson_resources (
  id         uuid        default gen_random_uuid() primary key,
  lesson_id  uuid        not null references public.lessons(id) on delete cascade,
  name       text        not null,
  file_url   text        not null,    -- URL pública desde Supabase Storage (bucket: library)
  mimetype   text        not null,    -- determina el ícono (pdf, zip, word, excel)
  file_size  bigint,
  position   int         not null default 0,
  created_at timestamptz default now()
);
```

Tipos admitidos: `pdf`, `zip`, `word (.doc/.docx)`, `excel (.xls/.xlsx)`.

### Tabla: `lesson_comments`

Comentarios públicos en una lección (docentes y alumnos). Soporta hilos de un nivel con `parent_id`.

```sql
create table public.lesson_comments (
  id         uuid        default gen_random_uuid() primary key,
  lesson_id  uuid        not null references public.lessons(id) on delete cascade,
  author_id  uuid        not null references public.profiles(id) on delete cascade,
  parent_id  uuid        references public.lesson_comments(id) on delete cascade,
  body       text        not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Tabla: `lesson_notes`

Notas privadas por alumno por lección. Una nota por alumno (se edita, no se acumula).

```sql
create table public.lesson_notes (
  id         uuid        default gen_random_uuid() primary key,
  lesson_id  uuid        not null references public.lessons(id) on delete cascade,
  student_id uuid        not null references public.profiles(id) on delete cascade,
  body       text        not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (lesson_id, student_id)
);
```

### Tabla: `lesson_submissions`

Cuando una lección es de tipo `link`, el alumno debe subir un certificado o documento probatorio para acreditar que completó el recurso externo. **Subir = completado automáticamente** (no requiere aprobación del admin).

```sql
create table public.lesson_submissions (
  id         uuid        default gen_random_uuid() primary key,
  lesson_id  uuid        not null references public.lessons(id) on delete cascade,
  student_id uuid        not null references public.profiles(id) on delete cascade,
  file_url   text        not null,
  file_name  text        not null,
  mimetype   text        not null,
  created_at timestamptz default now(),
  unique(lesson_id, student_id)    -- una entrega por alumno por lección
);
```

---

## Tipos TypeScript

```typescript
// lib/queries/modules.ts

type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  type: "video" | "link";
  video_id: string | null;
  external_url: string | null;
};

type ModuleRow = {
  id: string;
  title: string;
  position: number;
  lessons: LessonRow[];
};

type CourseWithModules = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: "borrador" | "publicado" | "archivado";
  teacher: string | null;
  modules: ModuleRow[];
};
```

---

## Estructura de archivos

```
app/
├── actions/
│   ├── modules.ts                              # CRUD módulos + lecciones
│   ├── lesson-resources.ts                     # addLessonResource, removeLessonResource, getLessonResources
│   ├── lesson-submissions.ts                   # getLessonSubmissions
│   └── lesson-comments.ts                      # addLessonComment, deleteLessonComment, getLessonComments
└── dashboard/
    └── courses/
        └── [id]/
            ├── page.tsx                        # Server component
            └── _components/
                ├── module-list.tsx             # Orquestador (client) — dueño del estado de dialogs
                ├── module-item.tsx             # Módulo colapsable (client)
                ├── lesson-item.tsx             # Fila de lección con menú Recursos / Entregas / Comentarios
                ├── create-module-dialog.tsx
                ├── edit-module-dialog.tsx
                ├── create-lesson-dialog.tsx
                ├── edit-lesson-dialog.tsx
                ├── lesson-resources-dialog.tsx  # Admin adjunta archivos a lección
                ├── lesson-submissions-dialog.tsx # Admin ve comprobantes subidos por alumnos
                └── lesson-comments-dialog.tsx   # Comentarios por lección

lib/
└── queries/
    └── modules.ts                              # getCourseWithModules()
```

---

## Server Actions — `app/actions/modules.ts`

> Todas usan `supabaseAdmin` — RLS habilitado sin políticas en `modules` y `lessons`.

### Módulos

| Función | Validación | Notas |
|---|---|---|
| `createModule(_prev, formData)` | `course_id` (uuid), `title` (min 1) | `position = max + 1` automático |
| `updateModule(_prev, formData)` | `id`, `course_id`, `title` | Solo actualiza `title` |
| `deleteModule(id, courseId)` | — | Hard delete, cascade elimina lecciones |

### Lecciones

| Función | Validación | Notas |
|---|---|---|
| `createLesson(_prev, formData)` | `discriminatedUnion` por `type` | `video` requiere `video_id`, `link` requiere `external_url` |
| `updateLesson(_prev, formData)` | `discriminatedUnion` por `type` | Limpia campo contrario al tipo activo |
| `deleteLesson(id, courseId)` | — | Soft delete — setea `deleted_at` |

Todas llaman `revalidatePath(/dashboard/courses/${courseId})` al terminar.

---

## Lógica de tipos de lección

| Tipo | Campo requerido | Uso |
|---|---|---|
| `video` | `video_id` (FK → `media_videos`) | Video interno procesado por la plataforma |
| `link` | `external_url` | Curso externo, certificación, recurso fuera de la plataforma |

Cuando el alumno completa una lección `link`, debe subir un documento probatorio (`lesson_submissions`). La presencia del registro equivale a "completado".

---

## Comportamiento de UI

### `ModuleList` (orquestador)
- Dueño de todo el estado de dialogs: `createModuleOpen`, `editingModule`, `createLessonModuleId`, `editingLesson`
- Los dialogs se montan fuera del árbol de módulos para evitar re-renders innecesarios
- Estado vacío con botón inline cuando no hay módulos

### `ModuleItem`
- Colapsable (`Collapsible` de shadcn) — abierto por defecto
- Cabecera: número de orden, título, contador de lecciones, dropdown (Editar, Eliminar)
- Footer: botón "Agregar lección" siempre visible al expandir
- Estado vacío cuando no tiene lecciones

### `LessonItem`
- Ícono según tipo: `PlayCircle` (video), `Link2` (link)
- Badge de tipo con color: violeta (video), azul (link)
- Dropdown: Editar, Eliminar, **Recursos**, **Ver entregas** (solo `link`), **Comentarios**

### `LessonResourcesDialog`
- Admin adjunta archivos de la biblioteca (bucket `library`) a la lección
- `MediaPicker` para seleccionar archivo existente → devuelve `publicUrl` vía `onChange`
- Campo "Nombre para mostrar" libre
- Lista de recursos con ícono según tipo (PDF, Excel, ZIP, imagen), nombre, tamaño y botón eliminar
- Fetch on open: `getLessonResources(lessonId)` al abrir el dialog
- Usa `useTransition` para add y delete (sin `useActionState`, sin form — ver nota técnica abajo)

### `LessonSubmissionsDialog`
- Admin ve todos los comprobantes subidos por alumnos en lecciones `link`
- Solo lectura: nombre del alumno, nombre del archivo, fecha, link de descarga
- Fetch on open: `getLessonSubmissions(lessonId)`

### `LessonCommentsDialog`
- Comentarios públicos por lección (docentes y alumnos)
- Lista de comentarios con avatar (inicial), nombre, badge de rol y fecha
- Formulario para agregar comentario (textarea + botón Publicar)
- Admin puede eliminar cualquier comentario
- Usa `useActionState` para el form de nuevo comentario, `useTransition` para eliminar

### Dialogs de lección (`CreateLessonDialog` / `EditLessonDialog`)
- Toggle visual Video / Enlace externo (no usa `<select>`, usa botones con estado activo)
- Si `video`: Select con lista de videos `status='listo'` de `media_videos`, muestra duración
- Si `link`: Input URL con validación
- Al cambiar de tipo se resetea el campo del tipo anterior

---

---

## Nota técnica — "Unexpected end of form" con server actions

### Causa

En Next.js 16 + Turbopack + React 19, cuando se usa `useActionState` + `<form action={action}>`, al enviar el form el servidor:
1. Ejecuta la server action
2. Re-renderiza toda la página como RSC y envía el payload de vuelta al cliente (RSC re-streaming)

Si el payload RSC supera los 10MB (por archivos grandes o muchos datos) el middleware de Supabase, que intercepta todos los POST, truncaba el body al límite por defecto de `middlewareClientMaxBodySize` (10MB) → stream cortado → error.

Además, los dialogs que importan server actions a nivel de módulo podían causar que Turbopack falle al serializar las referencias durante el SSR del RSC payload.

### Soluciones aplicadas

**1. `next.config.ts` — ampliar límite del middleware:**
```typescript
const nextConfig: NextConfig = {
  middlewareClientMaxBodySize: "2gb",   // antes: 10MB por defecto
  experimental: {
    serverActions: { bodySizeLimit: "2gb" },
  },
};
```

**2. Patrón `useTransition` para server actions en dialogs:**

En lugar de `useActionState` + `<form action>`, llamar la server action directamente:
```typescript
const [pending, startTransition] = useTransition();

function handleSubmit() {
  startTransition(async () => {
    const result = await miServerAction(arg1, arg2);
    if (result?.success) { /* actualizar estado local */ }
  });
}
```
- Sin form → sin RSC re-streaming → sin truncado de stream
- La server action recibe parámetros normales (no `FormData`)

**3. `next/dynamic` con `ssr: false` para dialogs con server actions:**
```typescript
const LessonResourcesDialog = dynamic(
  () => import("./lesson-resources-dialog").then((m) => m.LessonResourcesDialog),
  { ssr: false }
);
```
Evita que Turbopack procese los imports de server actions durante la generación del RSC payload del servidor.

**4. `MediaPicker` — upload con `useTransition`:**

El upload de archivos en `MediaPicker` también fue migrado de `useActionState` a `useTransition` para evitar el mismo problema durante subidas de archivos grandes.

---

## Próximos pasos

1. `certificates` — emitir certificado al completar todas las lecciones del curso
2. `lesson_notes` — notas privadas del alumno por lección
3. Vista del alumno — reproductor de video + navegación entre lecciones
4. UI para que el alumno suba comprobante en lecciones `link` (`lesson_submissions`)
5. Reordenamiento drag-and-drop de módulos y lecciones por `position`
6. Soft delete de lección ya implementado — pendiente: UI para ver/restaurar eliminadas

# Aula — Módulo Cursos

## Contexto

El módulo de Cursos gestiona el catálogo de la plataforma. Cada curso tiene un docente asignado, un estado de publicación, y puede tener alumnos inscritos mediante la tabla `enrollments`. La portada del curso se selecciona desde la Biblioteca de Medios.

---

## Base de datos

### Tabla: `courses`

```sql
create table public.courses (
  id            uuid default gen_random_uuid() primary key,
  title         text not null,
  description   text,
  cover_url     text,         -- URL pública desde Supabase Storage (bucket: library)
  teacher_id    uuid references public.profiles(id),
  status        text default 'borrador'
                check (status in ('borrador', 'publicado', 'archivado')),
  deleted_at    timestamptz default null,
  created_at    timestamptz default now()
);
```

- `cover_url` → URL de imagen del bucket `library` (Supabase Storage). Se selecciona desde MediaPicker.
- `status` → ciclo reversible: `borrador` ⇄ `publicado` ⇄ `archivado`
- `deleted_at` → soft delete. Siempre filtrar `where deleted_at is null`

### Tabla: `enrollments`

```sql
create table public.enrollments (
  id          uuid default gen_random_uuid() primary key,
  student_id  uuid references public.profiles(id) on delete cascade,
  course_id   uuid references public.courses(id) on delete cascade,
  enrolled_by uuid references public.profiles(id),
  enrolled_at timestamptz default now(),
  unique(student_id, course_id)
);
```

---

## Estructura de archivos

```
app/
├── actions/
│   └── courses.ts                          # createCourse, updateCourse, updateCourseStatus, deleteCourse
└── dashboard/
    └── courses/
        ├── page.tsx                        # Catálogo (server component, async)
        ├── [id]/
        │   ├── page.tsx                    # Detalle del curso (server component, async)
        │   └── _components/
        │       ├── module-list.tsx         # Orquestador cliente: estado de dialogs
        │       ├── module-item.tsx         # Módulo colapsable con acciones
        │       ├── lesson-item.tsx         # Fila de lección con acciones
        │       ├── create-module-dialog.tsx
        │       ├── edit-module-dialog.tsx
        │       ├── create-lesson-dialog.tsx
        │       └── edit-lesson-dialog.tsx
        └── _components/
            └── create-course-dialog.tsx    # Dialog de creación (client component)

components/
├── course-card.tsx                         # Tarjeta reutilizable (admin + alumno)
├── course-card-actions.tsx                 # Dropdown de acciones del admin (client)
└── edit-course-dialog.tsx                  # Dialog de edición (client, controlado)

lib/
└── queries/
    ├── courses.ts                          # getCourses() + CourseRow type
    └── modules.ts                          # getCourseWithModules() + tipos
```

---

## Flujo de datos — Catálogo

```
CoursesPage (server)
  ├── getCourses()        → lib/queries/courses.ts    → supabaseAdmin
  ├── getUsersByRole()    → lib/queries/users.ts      → RPC get_users_by_role('docente')
  └── getStorageFiles()  → lib/queries/storage.ts    → supabaseAdmin Storage
        ↓
  CourseCard (server, presentacional)
    └── CourseCardActions (client) → updateCourseStatus | deleteCourse
    └── EditCourseDialog  (client) → updateCourse
  CreateCourseDialog (client)      → createCourse
```

## Flujo de datos — Detalle del curso

```
CourseDetailPage (server)
  ├── getCourseWithModules() → lib/queries/modules.ts → supabaseAdmin
  ├── getVideos()            → lib/queries/videos.ts  → supabaseAdmin (solo status='listo')
  └── getStorageFiles()      → lib/queries/storage.ts → supabaseAdmin
        ↓
  ModuleList (client) — dueño de todo el estado de dialogs
    ├── ModuleItem (client) → deleteModule (useTransition)
    │   └── LessonItem (client) → deleteLesson (useTransition)
    ├── CreateModuleDialog  → createModule
    ├── EditModuleDialog    → updateModule
    ├── CreateLessonDialog  → createLesson
    └── EditLessonDialog    → updateLesson
```

---

## Queries

### `getCourses()` — `lib/queries/courses.ts`

```typescript
supabaseAdmin
  .from("courses")
  .select(`
    id, title, description, cover_url, status,
    teacher:profiles!teacher_id(full_name),
    enrollments(count)
  `)
  .is("deleted_at", null)
  .order("created_at", { ascending: false })
```

> Usa `supabaseAdmin` para bypassear RLS en el join con `profiles`.

Devuelve `CourseRow[]`:
```typescript
type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: "borrador" | "publicado" | "archivado";
  teacher: string | null;
  enrolled: number;
};
```

### `getCourseWithModules(courseId)` — `lib/queries/modules.ts`

```typescript
supabaseAdmin
  .from("courses")
  .select(`
    id, title, description, cover_url, status,
    teacher:profiles!teacher_id(full_name),
    modules(
      id, title, position,
      lessons(id, title, description, position, type, video_id, external_url, deleted_at)
    )
  `)
  .eq("id", courseId)
  .is("deleted_at", null)
  .single()
```

Ordena módulos y lecciones por `position` en el cliente. Filtra lecciones con `deleted_at !== null`.

---

## Server Actions — `app/actions/courses.ts`

| Función | Descripción |
|---|---|
| `createCourse` | Inserta curso con `status: 'borrador'`. Valida con Zod. |
| `updateCourse` | Actualiza título, descripción, docente y portada. |
| `updateCourseStatus` | Cambia status: `borrador` ↔ `publicado` ↔ `archivado`. |
| `deleteCourse` | Soft delete — setea `deleted_at`. |

> Todas usan `createClient()` (sesión del usuario). `courses` no tiene RLS habilitado.

## Server Actions — `app/actions/modules.ts`

| Función | Descripción |
|---|---|
| `createModule` | Inserta módulo. Calcula `position` como `max + 1`. |
| `updateModule` | Actualiza título. |
| `deleteModule` | Hard delete (cascade elimina las lecciones). |
| `createLesson` | Inserta lección tipo `video` o `link`. Valida con `discriminatedUnion`. |
| `updateLesson` | Actualiza lección. Limpia el campo contrario al tipo activo. |
| `deleteLesson` | Soft delete — setea `deleted_at`. |

> Todas usan `supabaseAdmin` porque `modules` y `lessons` tienen RLS habilitado sin políticas.

---

## Componente `CourseCard`

```typescript
// components/course-card.tsx
type Props = {
  course: CourseRow;
  showActions?: boolean;   // true = admin, false = alumno
  teachers?: Teacher[];    // requerido cuando showActions=true
  libraryFiles?: StorageFile[];
};
```

- Usa **stretched link** (`<Link>` absoluto `z-0`) para navegar a `/dashboard/courses/[id]`
- `CourseCardActions` tiene `z-10` para no interferir con el link
- `showActions=true` → muestra `CourseCardActions` con dropdown (Editar, Publicar, Archivar, Restaurar, Eliminar)
- `showActions=false` → solo info. Uso en vista del alumno.

### Transiciones de estado desde `CourseCardActions`

| Status actual | Opciones disponibles |
|---|---|
| `borrador` | Publicar, Archivar |
| `publicado` | Archivar |
| `archivado` | Republicar, Restaurar a borrador |

---

## Comportamiento de las páginas

### `/dashboard/courses` — Catálogo
- **Sin cursos:** estado vacío con botón "Nuevo curso"
- **Con cursos:** 4 KPIs (total, publicados, borrador, archivados) + grid de tarjetas
- KPIs calculados en el servidor filtrando el array (no hay query separada)

### `/dashboard/courses/[id]` — Detalle
- Banner con portada, título, status, docente y contadores (módulos / lecciones)
- Lista de módulos colapsables con sus lecciones
- Cada módulo: número de orden, título, contador de lecciones, dropdown (Editar, Eliminar)
- Cada lección: ícono de tipo (video/link), título, descripción, badge de tipo, dropdown (Editar, Eliminar)
- Estado vacío cuando no hay módulos
- Estado vacío dentro del módulo cuando no tiene lecciones

---

## Próximos pasos

1. Vista del alumno — consumir el curso (`CourseCard` con `showActions=false`)
2. Lección tipo `link` → el alumno sube certificado/documento probatorio (`lesson_submissions`)
3. Certificado de finalización del curso (`certificates`)
4. Soft delete de lección ya implementado — pendiente: UI para ver/restaurar eliminadas
5. ~~Inscripción de alumnos (`enrollments`)~~ — **implementado** (ver `docs/enrollments.md`)
6. ~~Recursos descargables por lección (`lesson_resources`)~~ — **implementado**
7. ~~Comentarios por lección (`lesson_comments`)~~ — **implementado**
8. Notas privadas del alumno (`lesson_notes`)
9. Reordenamiento drag-and-drop de módulos y lecciones

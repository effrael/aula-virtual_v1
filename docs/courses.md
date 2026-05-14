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
- `status` → ciclo: `borrador` → `publicado` → `archivado`
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
│   └── courses.ts                          # createCourse (server action)
└── dashboard/
    └── courses/
        ├── page.tsx                        # Catálogo (server component, async)
        └── _components/
            └── create-course-dialog.tsx    # Dialog de creación (client component)

components/
└── course-card.tsx                         # Tarjeta reutilizable (admin + alumno)

lib/
└── queries/
    └── courses.ts                          # getCourses() + CourseRow type
```

---

## Flujo de datos

```
CoursesPage (server)
  ├── getCourses()        → lib/queries/courses.ts → Supabase (con join a profiles + count enrollments)
  ├── getUsersByRole()    → lib/queries/users.ts   → RPC get_users_by_role('docente')
  └── getStorageFiles()  → lib/queries/storage.ts → Supabase Storage bucket 'library'
        ↓
  CreateCourseDialog (client)
    └── MediaPicker (accept="image") → filtra solo imágenes del library
        ↓
  createCourse (server action)
    └── supabase.from("courses").insert({ title, description, teacher_id, cover_url })
        └── revalidatePath("/dashboard/courses")
```

---

## Query principal: `getCourses()`

```typescript
// lib/queries/courses.ts
supabase
  .from("courses")
  .select(`
    id, title, description, cover_url, status,
    teacher:profiles!teacher_id(full_name),
    enrollments(count)
  `)
  .is("deleted_at", null)
  .order("created_at", { ascending: false })
```

Devuelve `CourseRow[]`:
```typescript
type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: "borrador" | "publicado" | "archivado";
  teacher: string | null;   // full_name del docente
  enrolled: number;         // count de enrollments
};
```

---

## Server Action: `createCourse`

```typescript
// app/actions/courses.ts
// Campos: title (requerido), description (opcional), teacher_id (uuid, requerido), cover_url (url, opcional)
// Status inicial: "borrador"
// Validación: Zod
// Al terminar: revalidatePath("/dashboard/courses")
```

---

## Componente `CourseCard`

```typescript
// components/course-card.tsx
type Props = {
  course: CourseRow;
  showActions?: boolean; // true = muestra DropdownMenu (admin). false = sin menú (alumno)
};
```

- `showActions=true` → muestra Editar, Ver alumnos, Archivar, Eliminar
- `showActions=false` (default) → solo info. Uso en vista del alumno.
- Si `cover_url` existe → muestra imagen. Si no → ícono placeholder.

---

## Comportamiento de la página

- **Sin cursos:** oculta KPIs, muestra estado vacío con botón "Nuevo curso"
- **Con cursos:** muestra 4 KPIs (total, publicados, borrador, archivados) calculados dinámicamente + grid de tarjetas
- **KPIs:** calculados en el servidor filtrando el array de cursos (no hay query separada)

---

## Próximos pasos

1. Editar curso (modal o página `/dashboard/courses/[id]/edit`)
2. Publicar / archivar curso desde el DropdownMenu
3. Soft delete de curso
4. Vista de alumnos inscritos por curso
5. Inscripción de alumnos (`enrollments`)
6. Vista del alumno: `CourseCard` con `showActions=false`

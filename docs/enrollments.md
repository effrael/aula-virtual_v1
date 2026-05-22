# Aula — Inscripciones de Alumnos (Enrollments)

## Contexto

Un admin inscribe manualmente alumnos a cursos desde el detalle del curso. La tabla `enrollments` ya existía en el schema. Un alumno puede estar inscrito a muchos cursos; un curso puede tener muchos alumnos.

---

## Base de datos

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

- `unique(student_id, course_id)` → evita inscripciones duplicadas
- `enrolled_by` → quién hizo la inscripción (trazabilidad)

---

## Estructura de archivos

```
app/
├── actions/
│   └── enrollments.ts                              # enrollStudent, unenrollStudent
└── dashboard/
    └── courses/
        └── [id]/
            └── _components/
                └── enrollments-section.tsx         # Sección completa (lista + dialog)

lib/
└── queries/
    └── enrollments.ts                              # getEnrollments(), getStudents()
```

---

## Queries

### `getEnrollments(courseId)` — `lib/queries/enrollments.ts`

```typescript
supabaseAdmin
  .from("enrollments")
  .select("id, student_id, enrolled_at, student:profiles!student_id(full_name)")
  .eq("course_id", courseId)
  .order("enrolled_at", { ascending: false })
```

Devuelve `EnrollmentRow[]`:
```typescript
type EnrollmentRow = {
  id: string;
  student_id: string;
  full_name: string;
  enrolled_at: string;
};
```

### `getStudents()` — `lib/queries/enrollments.ts`

Todos los alumnos activos disponibles para inscribir:

```typescript
supabaseAdmin
  .from("profiles")
  .select("id, full_name")
  .eq("role", "alumno")
  .eq("status", "activo")
  .is("deleted_at", null)
  .order("full_name")
```

Devuelve `StudentRow[]`:
```typescript
type StudentRow = {
  id: string;
  full_name: string;
};
```

---

## Server Actions — `app/actions/enrollments.ts`

| Función | Descripción |
|---|---|
| `enrollStudent(courseId, studentId)` | Inserta en `enrollments`. Retorna error si ya inscrito. |
| `unenrollStudent(enrollmentId, courseId)` | Elimina la fila de `enrollments`. |

Ambas usan `supabaseAdmin` y llaman `revalidatePath(/dashboard/courses/${courseId})`.

Ambas retornan `{ success?: boolean; message?: string } | undefined`.

---

## Componente `EnrollmentsSection`

`app/dashboard/courses/[id]/_components/enrollments-section.tsx`

Componente cliente que recibe:
```typescript
type Props = {
  courseId: string;
  initialEnrollments: EnrollmentRow[];
  students: StudentRow[];         // todos los alumnos activos
};
```

### Funcionalidades

- **Lista** de alumnos inscritos con fecha de inscripción y botón para dar de baja
- **Búsqueda** para filtrar alumnos no inscritos por nombre (filtro local en cliente)
- **Dialog** para agregar alumnos — muestra solo los que no están ya inscritos

### Patrón de actualización

Usa `useTransition` para llamadas imperativas (sin form ni `useActionState`):

```typescript
const [pending, startTransition] = useTransition();

function handleEnroll(studentId: string) {
  startTransition(async () => {
    const result = await enrollStudent(courseId, studentId);
    if (result?.success) {
      toast.success("Alumno inscrito.");
      // actualiza estado local
    }
  });
}
```

---

## Integración en `page.tsx`

```typescript
// app/dashboard/courses/[id]/page.tsx
const [course, readyVideos, enrollments, students] = await Promise.all([
  getCourseWithModules(id),
  getReadyVideos(),
  getEnrollments(id),
  getStudents(),
]);
```

`EnrollmentsSection` se renderiza debajo de `ModuleList`.

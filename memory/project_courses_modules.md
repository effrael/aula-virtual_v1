---
name: Sistema de cursos y módulos
description: Flujo completo de cursos, módulos, lecciones, inscripciones — queries, actions, páginas y componentes
type: project
---

## Tablas de BD involucradas

| Tabla | Qué almacena |
|---|---|
| `courses` | Título, descripción, cover_url, status, teacher_id, deleted_at |
| `modules` | Módulos de un curso: title, position, is_active, course_id |
| `lessons` | Lecciones de un módulo: title, type (video/link/quiz), video_id, external_url, position, deleted_at |
| `enrollments` | Relación alumno ↔ curso: student_id, course_id, enrolled_at |
| `media_videos` | Videos procesados: hls_url, status, duration |
| `quizzes` | Quiz vinculado a una lección tipo "quiz" |
| `profiles` | Se lee para docente (full_name) y conteo |

---

## Queries (lib/queries/)

### `courses.ts`
- `getCourses()` — todos los cursos (admin/colaborador)
- `getCoursesByTeacher(teacherId)` — cursos del docente
- `getCoursesByStudent(studentId)` — cursos donde el alumno está inscrito (via enrollments)
- Tipo: `CourseRow` — id, title, description, cover_url, status, teacher_id, teacher, enrolled

### `modules.ts`
- `getCourseWithModules(courseId)` — curso + módulos + lecciones anidadas (filtra deleted_at=null en lecciones)
- Tipos: `ModuleRow`, `LessonRow`, `CourseWithModules`

### `enrollments.ts`
- `getEnrollments(courseId)` — alumnos inscritos con full_name
- `getStudents()` — todos los alumnos activos

### `videos.ts`
- `getVideos()` — todos los videos de `media_videos`
- En la página de detalle solo se usan los con `status="listo"`

---

## Server Actions (app/actions/)

### `courses.ts` → revalida `/dashboard/courses`
| Función | Qué hace |
|---|---|
| `createCourse` | INSERT en courses con status="borrador" |
| `updateCourse` | UPDATE title, description, teacher_id, cover_url |
| `updateCourseStatus` | UPDATE status (borrador/publicado/archivado) |
| `deleteCourse` | Soft delete: deleted_at = now() |

### `modules.ts` → revalida `/dashboard/courses/${courseId}`
| Función | Qué hace |
|---|---|
| `createModule` | INSERT en modules, posición = max+1 |
| `updateModule` | UPDATE title |
| `toggleModuleStatus` | UPDATE is_active |
| `deleteModule` | DELETE físico |
| `createLesson` | INSERT en lessons según tipo; si tipo=quiz también INSERT en quizzes |
| `updateLesson` | UPDATE campos según tipo |
| `deleteLesson` | Soft delete: deleted_at = now() |

### `enrollments.ts` → revalida `/dashboard/courses/${courseId}`
| Función | Qué hace |
|---|---|
| `enrollStudent` | INSERT en enrollments; error 23505 = ya inscrito |
| `unenrollStudent` | DELETE físico del registro |

---

## Páginas

### `/dashboard/courses` (`courses/page.tsx`)
- Lee rol del usuario → elige query según rol
- Calcula `perms = getPermissionsByRole(role)`
- KPIs: total, publicados, borradores, archivados
- Grid de `CourseCard` con `permissions` pasado como prop
- `CreateCourseDialog` solo si `perms.canCreate`

### `/dashboard/courses/[id]` (`courses/[id]/page.tsx`)
- `canEdit = role !== "alumno"`
- Si no hay curso → `notFound()`
- Carga videos/libraryFiles/enrollments/students solo si `canEdit`
- Renderiza `ModuleList` con `canEdit`
- Renderiza `EnrollmentsSection` solo si `canEdit`

---

## Componentes clave

### Compartidos (`components/`)
- **`CourseCard`** — tarjeta de curso; prop `permissions: CoursePermissions`; stretched link a detalle
- **`CourseCardActions`** — dropdown de acciones; exporta tipo `CoursePermissions`

`CoursePermissions`:
```typescript
{ canEdit: boolean; canPublish: boolean; canArchive: boolean; canDelete: boolean }
```

### Catálogo (`courses/_components/`)
- **`CreateCourseDialog`** — formulario: portada (MediaPicker), título, descripción, docente (Select)

### Detalle (`courses/[id]/_components/`)
- **`ModuleList`** — state manager central de todos los diálogos; monta dialogs fuera del árbol para evitar re-renders; carga LessonResourcesDialog, LessonSubmissionsDialog, LessonCommentsDialog, QuizEditorDialog, QuizAttemptsDialog con `dynamic({ ssr: false })`
- **`ModuleItem`** — módulo colapsable; header coloreado según `is_active`; DropdownMenu con editar/toggle; lista de `LessonItem`
- **`LessonItem`** — fila con ícono por tipo (PlayCircle/Link2/ClipboardList); badge de tipo; acciones contextuales según tipo
- **`CreateLessonDialog`** — tabs por tipo (video/link/quiz); video requiere Select de video disponible; link requiere URL; quiz no tiene campos extra
- **`EditLessonDialog`** — igual que create pero con defaultValues
- **`EnrollmentsSection`** — busca y filtra alumnos no inscritos; lista inscritos con opción de quitar

---

## Tipos de lección

| Tipo | Campo extra | Acciones disponibles |
|---|---|---|
| `video` | `video_id` (UUID de media_videos) | Editar, Recursos, Comentarios, Eliminar |
| `link` | `external_url` (URL) | Editar, Recursos, Ver entregas, Comentarios, Eliminar |
| `quiz` | ninguno | Editar, Gestionar preguntas, Ver intentos, Eliminar |

---

## Eliminación

| Entidad | Tipo de eliminación |
|---|---|
| Curso | Soft delete (`deleted_at`) |
| Módulo | Eliminación física |
| Lección | Soft delete (`deleted_at`) |
| Inscripción | Eliminación física |

**Why:** Los módulos eliminados físicamente porque no tienen valor histórico. Las lecciones son soft delete porque pueden tener entregas y comentarios asociados.

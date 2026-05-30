# Configuración de certificado por curso

## Contexto

Cada curso puede tener una plantilla de certificado asignada. Al emitir un certificado para un alumno de ese curso, la plantilla y los valores de los campos custom se toman de la configuración del curso — sin que el admin tenga que llenarlos manualmente cada vez.

---

## Cambios en base de datos

```sql
ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificate_template_id uuid REFERENCES certificate_templates(id);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificate_custom_inputs jsonb;
```

- `certificate_template_id` → plantilla pdfme asignada al curso
- `certificate_custom_inputs` → valores (literales o tokens) de los campos custom de la plantilla

---

## Sistema de tokens

Cada campo custom puede configurarse con un **token** que se resuelve al momento de emitir:

| Token | Resuelve a |
|---|---|
| `__fecha__` | Fecha de emisión en español (ej: "29 de mayo de 2026") |
| `__curso__` | Título del curso |
| `__docente.nombre__` | `full_name` del docente asignado al curso |
| `__docente.apellidos__` | `apellidos` del docente |
| `__docente.dni__` | `dni` del docente |
| `__nombre__` | Nombres del alumno |
| `__apellidos__` | Apellidos del alumno |
| `__dni__` | DNI del alumno |
| *(cualquier otro valor)* | Se usa como texto literal |

Ejemplo guardado en `certificate_custom_inputs`:
```json
{
  "instructor": "__docente.nombre__",
  "fecha_emision": "__fecha__",
  "sede": "Lima"
}
```

---

## Archivos modificados

### `lib/queries/modules.ts`

- Reemplazó `certificate_description` por `certificate_custom_inputs: Record<string, string> | null` en el tipo `CourseWithModules`
- El select incluye `certificate_custom_inputs` en lugar de `certificate_description`

### `app/actions/courses.ts` — `updateCourseCertificate`

```typescript
updateCourseCertificate(
  courseId: string,
  templateId: string | null,
  customInputs: Record<string, string> | null
)
```

Guarda `certificate_template_id` y `certificate_custom_inputs` en `courses`.

### `app/actions/certificates.ts` — `generateCertificate`

1. Fetcha el docente del curso: `teacher:profiles!teacher_id(full_name, apellidos, dni)`
2. Lee `course.certificate_custom_inputs`
3. Resuelve tokens con `tokenMap` construido tras obtener datos del alumno, docente y fecha
4. Si el admin pasa `customInputs` explícitos al emitir manualmente, esos tienen prioridad

```typescript
const tokenMap = {
  __fecha__:               fechaEmision,          // Intl formateado es-PE
  __curso__:               course.title,
  "__docente.nombre__":    teacher?.full_name,
  "__docente.apellidos__": teacher?.apellidos,
  "__docente.dni__":       teacher?.dni,
  __nombre__:              nombre,
  __apellidos__:           apellidos,
  __dni__:                 dni,
};
```

### `app/dashboard/courses/[id]/page.tsx`

- Lee `searchParams.page` para paginación server-side de alumnos
- Extrae `customFields` de cada plantilla (desde `pdfme_template.schemas`, excluyendo auto-fields)
- Pasa `certTemplatesForSection` (con `customFields`) y `initialCustomInputs` a `CertificateSection`
- **Orden de secciones:** Certificado de finalización → Alumnos inscritos

### `app/dashboard/courses/[id]/_components/certificate-section.tsx`

UI para configurar el certificado del curso:

- Selector de plantilla
- Badges de campos automáticos (`nombre`, `apellidos`, `dni`, `codigo`, `qr`)
- Por cada campo custom de la plantilla: un `<select>` con las fuentes disponibles + input de texto solo cuando la fuente es "Valor manual"
- Constante exportada `FIELD_SOURCES` con todos los tokens disponibles

---

## Tabla de alumnos inscritos — mejoras

### `lib/queries/enrollments.ts` — `getEnrollments`

Firma actualizada:
```typescript
getEnrollments(courseId: string, page: number, pageSize: number)
  → { data: EnrollmentRow[], total: number }
```

- Paginación server-side con `.range(from, to)` y `count: 'exact'`
- Fetcha `apellidos` y `dni` del join con `profiles`
- Fetcha `email` via `supabaseAdmin.auth.admin.getUserById(studentId)` por cada fila de la página

Tipo `EnrollmentRow` actualizado:
```typescript
type EnrollmentRow = {
  id: string;
  student_id: string;
  full_name: string;
  apellidos: string;
  dni: string;
  email: string;
  enrolled_at: string;
};
```

### `app/dashboard/courses/[id]/_components/enrollments-section.tsx`

- Tabla con columnas: **Nombre y apellidos | Email | DNI | Acciones**
- Paginación via `?page=N` en la URL (navegación server-side)
- El total viene de Supabase (`count: 'exact'`), no del frontend
- Props: `enrollments`, `students`, `total`, `page`, `pageSize`

# Aula — Módulo Quizzes

## Contexto

Los quizzes son un tipo de lección dentro de un módulo. Su propósito es evaluar el conocimiento del alumno en puntos clave del curso. A diferencia de las lecciones de video o enlace, un quiz actúa como indicador de progreso: si el alumno no lo aprueba, queda registrado pero **no se le bloquea el avance** (bloqueo orientativo). La excepción es el **examen final**, que es de bloqueo estricto: el alumno debe aprobarlo para obtener el certificado del curso.

---

## Tipos de pregunta

| Tipo | Descripción |
|---|---|
| `single` | Una sola respuesta correcta entre varias opciones |
| `multiple` | Varias respuestas correctas posibles |
| `opinion` | Respuesta de texto libre, sin corrección automática |

---

## Configuración del quiz

Cada quiz (lección de tipo `quiz`) tiene su propia configuración:

| Campo | Tipo | Descripción |
|---|---|---|
| `time_limit_mins` | `int \| null` | Tiempo límite en minutos. `null` = sin límite |
| `randomize` | `boolean` | Si `true`, las preguntas y opciones se barajan al cargar |
| `passing_score` | `int` | Porcentaje mínimo para considerar aprobado (ej. 70) |
| `is_certification` | `boolean` | Si `true`, es el examen final del curso |
| `max_attempts` | `int \| null` | Intentos máximos permitidos. `null` = ilimitado |

---

## Lógica de progreso y bloqueo

### Quizzes intermedios (is_certification = false)
- El alumno puede intentarlo las veces que el `max_attempts` permita
- Si no aprueba, queda marcado como **no aprobado** en su progreso
- **No bloquea el avance** — puede continuar con la siguiente lección
- Se muestra una advertencia visual indicando que no lo ha aprobado aún

### Examen final (is_certification = true)
- Solo se desbloquea cuando el alumno ha completado **todas las lecciones del curso**
- Es de **bloqueo estricto**: sin aprobarlo no se emite el certificado
- Puede reintentarse hasta `max_attempts` veces (si está configurado)
- Al aprobarlo, se dispara la emisión del certificado

### Flujo completo del alumno

```
lección (video) → completada al verla
lección (link)  → completada al subir el comprobante
lección (quiz)  → completada al aprobarlo (orientativo si es intermedio)
                                          (obligatorio si es examen final)
     ↓
[todas las lecciones completadas o vistas]
     ↓
examen final desbloqueado 🔒
     ↓
alumno aprueba examen final
     ↓
certificado emitido ✓
```

---

## Base de datos

### Cambio en `lessons`

Se añade `quiz` como tipo válido de lección:

```sql
alter table public.lessons
  drop constraint lessons_type_check,
  add constraint lessons_type_check
    check (type in ('video', 'link', 'quiz'));
```

Los constraints `lesson_video_requires_id` y `lesson_link_requires_url` ya excluyen al tipo `quiz` por su condición (`type != 'video'` / `type != 'link'`), por lo que no requieren cambios.

### Tabla: `quizzes`

Configuración del quiz, ligado a una lección de tipo `quiz`.

```sql
create table public.quizzes (
  id               uuid        default gen_random_uuid() primary key,
  lesson_id        uuid        not null references public.lessons(id) on delete cascade,
  time_limit_mins  int,                         -- null = sin límite
  randomize        boolean     not null default false,
  passing_score    int         not null default 70,
  is_certification boolean     not null default false,
  max_attempts     int,                         -- null = ilimitado
  created_at       timestamptz default now()
);
```

### Tabla: `quiz_questions`

```sql
create table public.quiz_questions (
  id         uuid        default gen_random_uuid() primary key,
  quiz_id    uuid        not null references public.quizzes(id) on delete cascade,
  body       text        not null,
  type       text        not null check (type in ('single', 'multiple', 'opinion')),
  position   int         not null default 0,
  points     int         not null default 1
);
```

### Tabla: `quiz_options`

Opciones de respuesta para preguntas de tipo `single` y `multiple`. No aplica a `opinion`.

```sql
create table public.quiz_options (
  id          uuid    default gen_random_uuid() primary key,
  question_id uuid    not null references public.quiz_questions(id) on delete cascade,
  body        text    not null,
  is_correct  boolean not null default false,
  position    int     not null default 0
);
```

### Tabla: `quiz_attempts`

Registro de cada intento de un alumno en un quiz.

```sql
create table public.quiz_attempts (
  id          uuid        default gen_random_uuid() primary key,
  quiz_id     uuid        not null references public.quizzes(id) on delete cascade,
  student_id  uuid        not null references public.profiles(id) on delete cascade,
  score       int,        -- porcentaje obtenido (calculado al finalizar)
  passed      boolean,    -- score >= passing_score
  started_at  timestamptz default now(),
  finished_at timestamptz
);
```

### Tabla: `quiz_answers`

Respuestas del alumno por pregunta dentro de un intento.

```sql
create table public.quiz_answers (
  id               uuid  default gen_random_uuid() primary key,
  attempt_id       uuid  not null references public.quiz_attempts(id) on delete cascade,
  question_id      uuid  not null references public.quiz_questions(id) on delete cascade,
  selected_options uuid[],  -- IDs de quiz_options elegidas (single / multiple)
  text_answer      text,    -- respuesta libre (opinion)
  unique(attempt_id, question_id)
);
```

### Tabla: `lesson_progress`

Rastrea el estado de cada lección por alumno. Es la fuente de verdad para saber qué ha completado un alumno.

```sql
create table public.lesson_progress (
  id          uuid        default gen_random_uuid() primary key,
  lesson_id   uuid        not null references public.lessons(id) on delete cascade,
  student_id  uuid        not null references public.profiles(id) on delete cascade,
  completed   boolean     not null default false,
  completed_at timestamptz,
  unique(lesson_id, student_id)
);
```

- Lección `video`: se marca `completed = true` cuando el alumno la visualiza
- Lección `link`: se marca `completed = true` al subir el comprobante (`lesson_submissions`)
- Lección `quiz`: se marca `completed = true` al aprobar el quiz (score >= passing_score)

---

## Cálculo del score

```
score = round( sum(points de preguntas correctas) / sum(points totales) * 100 )
```

- Para `single`: correcta si la opción seleccionada tiene `is_correct = true`
- Para `multiple`: correcta si el conjunto de opciones seleccionadas coincide exactamente con todas las opciones `is_correct = true`
- Para `opinion`: no entra en el cálculo automático (siempre suma sus `points` o se omite)

---

## Estructura de archivos (a implementar)

```
app/
├── actions/
│   └── quizzes.ts                          # CRUD quiz + preguntas + opciones + intentos
└── dashboard/
    └── courses/
        └── [id]/
            └── _components/
                ├── create-lesson-dialog.tsx     # añadir opción tipo 'quiz'
                ├── edit-lesson-dialog.tsx        # ídem
                ├── quiz-editor-dialog.tsx        # gestionar preguntas y opciones del quiz
                └── quiz-attempts-dialog.tsx      # admin ve intentos de alumnos

lib/
└── queries/
    └── quizzes.ts                          # getQuizWithQuestions(), getQuizAttempts()

app/migrations/
    └── 06_quizzes.sql                      # migración completa
```

---

## Panel de administración — funcionalidades

### En la vista del módulo (lesson-item)
- El badge de tipo muestra `Quiz` (color distinto, ej. naranja)
- El dropdown incluye: **Editar**, **Gestionar preguntas**, **Ver intentos**, **Eliminar**
- Si `is_certification = true`: badge adicional "Examen final"

### Quiz editor dialog (`quiz-editor-dialog.tsx`)
- Configuración del quiz: timer, aleatorio, score mínimo, intentos máximos, marcar como examen final
- Lista de preguntas con posición y tipo
- Crear / editar / eliminar preguntas
- Por cada pregunta de tipo `single` o `multiple`: gestionar opciones y marcar cuál(es) son correctas
- Vista previa del quiz

### Quiz attempts dialog (`quiz-attempts-dialog.tsx`)
- Lista de todos los intentos de alumnos: nombre, score, aprobado/reprobado, fecha
- Para preguntas de opinión: ver respuesta de texto del alumno

---

## Próximos pasos (fuera del admin)

1. Vista del alumno: renderizar el quiz, enviar respuestas, ver resultado
2. Bloqueo del examen final en la UI del alumno hasta completar todas las lecciones
3. Emisión de certificado al aprobar el examen final
4. Historial de intentos visible para el alumno

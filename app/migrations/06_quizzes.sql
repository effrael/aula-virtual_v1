-- ─────────────────────────────────────────────────────────────────────────────
-- 06 · Quizzes
-- ─────────────────────────────────────────────────────────────────────────────
-- Los quizzes son lecciones de tipo 'quiz' dentro de un módulo.
-- Quizzes intermedios: bloqueo orientativo (el alumno puede avanzar aunque no apruebe).
-- Examen final (is_certification=true): bloqueo estricto — sin aprobarlo no hay certificado.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Ampliar el tipo de lección ────────────────────────────────────────────────
-- Añade 'quiz' al check constraint existente en lessons.type
-- El nombre del constraint auto-generado por Postgres es lessons_type_check

alter table public.lessons
  drop constraint lessons_type_check,
  add constraint lessons_type_check
    check (type in ('video', 'link', 'quiz'));

-- Los constraints lesson_video_requires_id y lesson_link_requires_url ya
-- excluyen 'quiz' por su condición (type != 'video' / type != 'link'),
-- por lo que no requieren cambios.

-- ── quizzes ───────────────────────────────────────────────────────────────────
-- Configuración del quiz, uno por lección de tipo 'quiz'.
-- Se crea automáticamente al crear una lección tipo quiz.

create table public.quizzes (
  id               uuid        default gen_random_uuid() primary key,
  lesson_id        uuid        not null references public.lessons(id) on delete cascade,
  time_limit_mins  int,                              -- null = sin límite de tiempo
  randomize        boolean     not null default false,
  passing_score    int         not null default 70,  -- % mínimo para aprobar
  is_certification boolean     not null default false,
  max_attempts     int,                              -- null = intentos ilimitados
  created_at       timestamptz default now(),

  unique (lesson_id)
);

-- ── quiz_questions ────────────────────────────────────────────────────────────
-- Preguntas del quiz ordenadas por position.

create table public.quiz_questions (
  id         uuid        default gen_random_uuid() primary key,
  quiz_id    uuid        not null references public.quizzes(id) on delete cascade,
  body       text        not null,
  type       text        not null
             check (type in ('single', 'multiple', 'opinion')),
  position   int         not null default 0,
  points     int         not null default 1
);

-- ── quiz_options ──────────────────────────────────────────────────────────────
-- Opciones de respuesta para preguntas de tipo 'single' y 'multiple'.
-- No aplica para preguntas de tipo 'opinion'.

create table public.quiz_options (
  id          uuid    default gen_random_uuid() primary key,
  question_id uuid    not null references public.quiz_questions(id) on delete cascade,
  body        text    not null,
  is_correct  boolean not null default false,
  position    int     not null default 0
);

-- ── quiz_attempts ─────────────────────────────────────────────────────────────
-- Registro de cada intento de un alumno en un quiz.
-- score se calcula al finalizar el intento.

create table public.quiz_attempts (
  id          uuid        default gen_random_uuid() primary key,
  quiz_id     uuid        not null references public.quizzes(id) on delete cascade,
  student_id  uuid        not null references public.profiles(id) on delete cascade,
  score       int,         -- porcentaje obtenido (0–100), null si está en progreso
  passed      boolean,     -- score >= passing_score, null si está en progreso
  started_at  timestamptz default now(),
  finished_at timestamptz
);

-- ── quiz_answers ──────────────────────────────────────────────────────────────
-- Respuestas del alumno por pregunta dentro de un intento.

create table public.quiz_answers (
  id               uuid  default gen_random_uuid() primary key,
  attempt_id       uuid  not null references public.quiz_attempts(id) on delete cascade,
  question_id      uuid  not null references public.quiz_questions(id) on delete cascade,
  selected_options uuid[],   -- IDs de quiz_options seleccionadas (single / multiple)
  text_answer      text,     -- respuesta libre (opinion)

  unique(attempt_id, question_id)
);

-- ── lesson_progress ───────────────────────────────────────────────────────────
-- Rastrea el estado de completado de cada lección por alumno.
-- Es la fuente de verdad para saber qué ha completado un alumno.
--
-- Completado según tipo:
--   video    → al visualizarla
--   link     → al subir el comprobante (lesson_submissions)
--   quiz     → al aprobar el quiz (score >= passing_score)

create table public.lesson_progress (
  id           uuid        default gen_random_uuid() primary key,
  lesson_id    uuid        not null references public.lessons(id) on delete cascade,
  student_id   uuid        not null references public.profiles(id) on delete cascade,
  completed    boolean     not null default false,
  completed_at timestamptz,

  unique(lesson_id, student_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.quizzes          enable row level security;
alter table public.quiz_questions   enable row level security;
alter table public.quiz_options     enable row level security;
alter table public.quiz_attempts    enable row level security;
alter table public.quiz_answers     enable row level security;
alter table public.lesson_progress  enable row level security;

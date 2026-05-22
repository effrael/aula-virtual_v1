-- ─────────────────────────────────────────────────────────────────────────────
-- 04 · Módulos, lecciones y contenido asociado
-- ─────────────────────────────────────────────────────────────────────────────
-- Jerarquía: course → module → lesson
-- Una lección puede ser: video (ref. media_videos) o enlace externo.
-- Cada lección puede tener: recursos descargables, comentarios y notas privadas.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── modules ──────────────────────────────────────────────────────────────────
-- Agrupan lecciones dentro de un curso.
-- Un curso con una sola sección tendrá un único módulo (invisible en la UI).

create table public.modules (
  id         uuid        default gen_random_uuid() primary key,
  course_id  uuid        not null references public.courses(id) on delete cascade,
  title      text        not null,
  position   int         not null default 0,  -- orden dentro del curso
  created_at timestamptz default now()
);

-- ── lessons ───────────────────────────────────────────────────────────────────
-- Unidad mínima de contenido dentro de un módulo.
-- type = 'video'  → video_id apunta a media_videos
-- type = 'link'   → external_url contiene la URL del recurso externo

create table public.lessons (
  id           uuid        default gen_random_uuid() primary key,
  module_id    uuid        not null references public.modules(id) on delete cascade,
  title        text        not null,
  description  text,                                         -- resumen opcional
  position     int         not null default 0,               -- orden dentro del módulo
  type         text        not null
               check (type in ('video', 'link')),
  video_id     uuid        references public.media_videos(id) on delete set null,
  external_url text,                                         -- válido cuando type = 'link'
  deleted_at   timestamptz default null,
  created_at   timestamptz default now(),

  -- garantiza coherencia según el tipo
  constraint lesson_video_requires_id
    check (type != 'video' or video_id is not null),
  constraint lesson_link_requires_url
    check (type != 'link' or (external_url is not null and external_url != ''))
);

-- ── lesson_resources ──────────────────────────────────────────────────────────
-- Archivos descargables adjuntos a una lección.
-- Se almacenan en Supabase Storage (bucket: library).
-- Tipos admitidos: pdf, zip, word (.doc/.docx), excel (.xls/.xlsx)

create table public.lesson_resources (
  id         uuid        default gen_random_uuid() primary key,
  lesson_id  uuid        not null references public.lessons(id) on delete cascade,
  name       text        not null,    -- nombre para mostrar al alumno
  file_url   text        not null,    -- URL pública desde Supabase Storage
  mimetype   text        not null,    -- determina el ícono (pdf, zip, word, excel)
  file_size  bigint,                  -- bytes (opcional, para mostrar tamaño)
  position   int         not null default 0,
  created_at timestamptz default now()
);

-- ── lesson_comments ───────────────────────────────────────────────────────────
-- Comentarios públicos en una lección (docentes y alumnos).
-- Soporta respuestas mediante parent_id (hilo de un nivel).

create table public.lesson_comments (
  id         uuid        default gen_random_uuid() primary key,
  lesson_id  uuid        not null references public.lessons(id) on delete cascade,
  author_id  uuid        not null references public.profiles(id) on delete cascade,
  parent_id  uuid        references public.lesson_comments(id) on delete cascade,
  body       text        not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── lesson_notes ──────────────────────────────────────────────────────────────
-- Notas privadas que cada alumno puede tomar en una lección.
-- Una nota por alumno por lección (se edita, no se duplica).

create table public.lesson_notes (
  id         uuid        default gen_random_uuid() primary key,
  lesson_id  uuid        not null references public.lessons(id) on delete cascade,
  student_id uuid        not null references public.profiles(id) on delete cascade,
  body       text        not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (lesson_id, student_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.modules          enable row level security;
alter table public.lessons          enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.lesson_comments  enable row level security;
alter table public.lesson_notes     enable row level security;

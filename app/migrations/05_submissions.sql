-- ─────────────────────────────────────────────────────────────────────────────
-- 05 · Entregas de alumnos en lecciones tipo "link"
-- ─────────────────────────────────────────────────────────────────────────────
-- Cuando una lección es type = 'link', el alumno debe subir un PDF o imagen
-- como comprobante de que completó el recurso externo.
-- Subir el archivo = completado automáticamente (sin aprobación del admin).
-- ─────────────────────────────────────────────────────────────────────────────

create table public.lesson_submissions (
  id         uuid        default gen_random_uuid() primary key,
  lesson_id  uuid        not null references public.lessons(id) on delete cascade,
  student_id uuid        not null references public.profiles(id) on delete cascade,
  file_url   text        not null,
  file_name  text        not null,
  mimetype   text        not null,  -- 'application/pdf' | 'image/*'
  created_at timestamptz default now(),

  unique(lesson_id, student_id)     -- una entrega por alumno por lección
);

alter table public.lesson_submissions enable row level security;

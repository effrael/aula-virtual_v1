  create table public.courses (
    id            uuid default gen_random_uuid() primary key,
    title         text not null,
    description   text,
    cover_url     text,                          -- imagen de portada (Supabase Storage)
    teacher_id    uuid references public.profiles(id),
    status        text default 'borrador'
                  check (status in ('borrador', 'publicado', 'archivado')),
    deleted_at    timestamptz default null,
    created_at    timestamptz default now()
  );

    create table public.enrollments (
    id          uuid default gen_random_uuid() primary key,
    student_id  uuid references public.profiles(id) on delete cascade,
    course_id   uuid references public.courses(id) on delete cascade,
    enrolled_by uuid references public.profiles(id), -- quién lo inscribió
    enrolled_at timestamptz default now(),
    unique(student_id, course_id)
  );
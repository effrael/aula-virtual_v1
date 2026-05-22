-- ─────────────────────────────────────────────────────────────────────────────
-- 10 · Anuncios (Comunicación)
-- ─────────────────────────────────────────────────────────────────────────────
-- Los anuncios permiten al admin comunicarse con usuarios de la plataforma.
-- El admin crea el anuncio, elige tipo, destinatarios y canal, y lo envía.
-- La tabla announcement_reads rastrea quién ha leído cada anuncio.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── announcements ─────────────────────────────────────────────────────────────

create table public.announcements (
  id               uuid        default gen_random_uuid() primary key,
  title            text        not null
                               check (char_length(title) between 1 and 150),
  content          text        not null,
  type             text        not null
                               check (type in ('informativo', 'urgente', 'recordatorio')),
  status           text        not null default 'borrador'
                               check (status in ('borrador', 'enviado', 'programado', 'archivado')),

  -- Destinatarios
  target_type      text        not null default 'todos'
                               check (target_type in ('todos', 'alumnos', 'docentes', 'curso')),
  target_course_id uuid        references public.courses(id) on delete set null,

  -- Canales de envío
  channel_platform boolean     not null default true,
  channel_email    boolean     not null default false,

  -- Programación
  send_at          timestamptz,           -- null = inmediato; futuro = programado
  sent_at          timestamptz,           -- cuando se envió realmente

  -- Banner opcional
  banner_url       text,                  -- URL de imagen del banner
  banner_link      text,                  -- enlace al hacer clic en el banner (opcional)

  -- CTA opcional
  cta_text         text,                  -- texto del botón CTA
  cta_url          text,                  -- URL de destino del botón CTA

  -- Auditoría
  created_by       uuid        references public.profiles(id) on delete set null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── announcement_reads ────────────────────────────────────────────────────────
-- Registra quién ha leído cada anuncio (para el conteo y la campana).

create table public.announcement_reads (
  announcement_id  uuid        not null
                               references public.announcements(id) on delete cascade,
  user_id          uuid        not null
                               references public.profiles(id) on delete cascade,
  read_at          timestamptz default now(),

  primary key (announcement_id, user_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.announcements      enable row level security;
alter table public.announcement_reads enable row level security;

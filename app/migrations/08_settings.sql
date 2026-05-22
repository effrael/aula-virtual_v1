-- Tabla singleton de configuración de la instancia
create table public.settings (
  id            int  primary key default 1 check (id = 1),
  name          text not null default 'Mi Institución',
  tagline       text not null default 'Plataforma virtual',
  logo_url      text,
  primary_color text not null default '#000000',
  updated_at    timestamptz default now()
);

-- Fila inicial
insert into public.settings (id) values (1) on conflict do nothing;

alter table public.settings enable row level security;

-- Nota: crear bucket "settings" en Supabase Storage (público)
-- Storage → New bucket → name: "settings" → Public: true

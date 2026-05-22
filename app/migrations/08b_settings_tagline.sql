alter table public.settings
  add column if not exists tagline text not null default 'Plataforma virtual';

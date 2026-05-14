create table public.media_videos (
  id           uuid default gen_random_uuid() primary key,
  title        text not null,
  status       text default 'procesando'
               check (status in ('procesando', 'listo', 'error')),
  duration     int,           -- segundos
  hls_url      text,          -- URL del master.m3u8
  file_size    bigint,        -- bytes del archivo original
  uploaded_by  uuid references public.profiles(id),
  created_at   timestamptz default now()
);

alter table public.media_videos enable row level security;

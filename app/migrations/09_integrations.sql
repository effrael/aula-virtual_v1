create table public.integrations (
  id           text primary key,           -- ej. 'google_meet'
  enabled      boolean not null default false,
  credentials  text,                       -- JSON encriptado AES-256-GCM
  updated_at   timestamptz default now()
);

-- Fila inicial para Google Meet
insert into public.integrations (id) values ('google_meet') on conflict do nothing;

alter table public.integrations enable row level security;

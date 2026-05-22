-- ─────────────────────────────────────────────────────────────────────────────
-- 10b · Anuncios — Banner y CTA
-- Ejecutar si ya se corrió 10_announcements.sql sin estas columnas.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.announcements
  add column if not exists banner_url   text,   -- URL de imagen del banner
  add column if not exists banner_link  text,   -- enlace al hacer clic en el banner
  add column if not exists cta_text     text,   -- texto del botón CTA
  add column if not exists cta_url      text;   -- URL de destino del botón CTA

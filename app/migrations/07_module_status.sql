-- ─────────────────────────────────────────────────────────────────────────────
-- 07 · Estado activo/inactivo en módulos
-- ─────────────────────────────────────────────────────────────────────────────
-- Los módulos inactivos no se muestran a los alumnos pero el historial
-- de progreso se conserva intacto. El admin los sigue viendo con un
-- indicador visual de inactivo.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.modules
  add column is_active boolean not null default true;

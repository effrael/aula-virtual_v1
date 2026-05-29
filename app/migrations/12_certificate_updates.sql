-- ── Columna certificate_code en certificates ─────────────────────────────────
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_code text UNIQUE;

-- ── Configuración de certificado en courses ───────────────────────────────────
ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificate_template_id uuid REFERENCES certificate_templates(id);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificate_description text;

-- ── Secuencia para códigos progresivos ────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS certificate_number_seq START 1;

-- ── Función para obtener el siguiente número de forma atómica ─────────────────
CREATE OR REPLACE FUNCTION next_certificate_number()
RETURNS integer LANGUAGE sql SECURITY DEFINER AS $$
  SELECT nextval('certificate_number_seq')::integer;
$$;

-- ── Fuentes custom por plantilla ──────────────────────────────────────────────
-- [{name: "DM Sans", url: "https://..."}, ...]
ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS custom_fonts jsonb NOT NULL DEFAULT '[]'::jsonb;

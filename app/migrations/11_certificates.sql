-- Plantillas de certificado
create table certificate_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  pdf_url text not null,
  pdfme_template jsonb not null default '{}',
  created_at timestamptz default now(),
  deleted_at timestamptz
);

-- Certificados emitidos
create table certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id),
  course_id uuid not null references courses(id),
  template_id uuid references certificate_templates(id),
  verification_code uuid unique not null default gen_random_uuid(),
  pdf_url text,
  score integer,
  issued_at timestamptz default now()
);

create index on certificates(verification_code);
create index on certificates(student_id);
create index on certificates(course_id);

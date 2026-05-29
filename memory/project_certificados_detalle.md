---
name: Sistema de certificados — detalle completo
description: Arquitectura completa del sistema de certificados con @pdfme v6, designer, emisión manual/automática, campos dinámicos, QR, verificación pública
type: project
---

## Dependencias

- `@pdfme/common` ^6.1.2
- `@pdfme/generator` ^6.1.2
- `@pdfme/schemas` ^6.1.2
- `@pdfme/ui` ^6.1.2
- `bwip-js` ^4.10.1 — **OBLIGATORIO** para que los QR/barcodes se rendericen en el servidor (Node.js)

---

## Tablas (migración 11 + 12)

### certificate_templates
- id, name, description, pdf_url, pdfme_template (jsonb), created_at, deleted_at (soft delete)

### certificates
- id, student_id, course_id, template_id, verification_code (uuid, para URL pública), certificate_code (text, formato RC-0001-26), pdf_url, score, issued_at

### courses (columnas nuevas — migración 12)
- certificate_template_id (uuid, FK → certificate_templates) — plantilla asignada a este curso
- certificate_description (text) — texto del campo "descripcion" del certificado

---

## Campos auto-llenados al emitir

| Campo en el designer | Valor automático |
|---------------------|-----------------|
| `nombre` | Derivado de `full_name` restando `apellidos` (ej: "Juan") |
| `apellidos` | `profiles.apellidos` del alumno |
| `dni` | `profiles.dni` del alumno |
| `descripcion` | `courses.certificate_description` (configurado en el curso) |
| `codigo` | Formato RC-0001-26 (RC estático + secuencia + año) — guardado en `certificate_code` |
| `qr` | URL: `{APP_URL}/verify/{verification_code}` |

**Eliminados:** `fecha`, `curso`, `nota` — ya no son auto-fields.

---

## Código RC-0001-26

- Generado con función PostgreSQL `next_certificate_number()` (usa secuencia `certificate_number_seq`)
- Formato: `RC-{seq:04d}-{YY}` — la secuencia NO se resetea por año
- Se guarda en `certificates.certificate_code`
- Se muestra en la página de verificación `/verify/[code]` en lugar del UUID

---

## Flujo de emisión automática (quiz de certificación)

1. Alumno aprueba quiz con `is_certification = true`
2. `submitAttempt` en `quizzes.ts` verifica que no exista ya un certificado para ese alumno+curso
3. Si no existe, llama `generateCertificate(studentId, courseId, score)`
4. `generateCertificate` busca la plantilla: `templateId` explícito > `courses.certificate_template_id` > primera disponible
5. Genera `certificate_code` via RPC `next_certificate_number()`
6. INSERT en `certificates` → obtiene `verification_code` para QR
7. Genera PDF con auto-fields (nombre, apellidos, dni, descripcion, codigo, qr)
8. Sube PDF a `library/certificates/{courseId}/{studentId}/{timestamp}.pdf`
9. UPDATE `pdf_url` en el certificado

---

## Configuración de certificado por curso

En `/dashboard/courses/[id]` → sección "Certificado de finalización":
- Selector de plantilla (`certificate_template_id`)
- Textarea de descripción (`certificate_description`) → va al campo `descripcion` del template

---

## Archivos del sistema

### Server Actions
- `app/actions/certificate-templates.ts` — CRUD de plantillas
- `app/actions/certificates.ts` — Emisión, consulta, tipos; exporta `CERTIFICATE_AUTO_FIELDS`
- `app/actions/courses.ts` — incluye `updateCourseCertificate`

### Páginas
- `app/dashboard/certificates/page.tsx` — Vista dual alumno/admin
- `app/dashboard/certificates/[id]/designer/page.tsx` — Designer
- `app/dashboard/certificates/[id]/designer/_components/designer-loader.tsx` — Wrapper SSR:false
- `app/dashboard/certificates/[id]/designer/_components/template-designer.tsx` — @pdfme/ui Designer
- `app/dashboard/courses/[id]/_components/certificate-section.tsx` — Sección de config por curso
- `app/verify/page.tsx` — Formulario público
- `app/verify/[code]/page.tsx` — Verificación pública (muestra certificate_code, no UUID)

### Componentes del diálogo
- `_components/create-template-dialog.tsx` — Crear plantilla
- `_components/issue-certificate-dialog.tsx` — Emitir manual (AUTO_FIELDS actualizado)
- `_components/template-card.tsx` — Tarjeta con dropdown: Diseñar / Renombrar / Eliminar

---

## Campos dinámicos (custom)

Cualquier campo en el designer que NO sea auto-llenado aparece como input obligatorio en `IssueCertificateDialog`. Ej: `instructor`, `horas`, `institucion`.

---

## Prevención de duplicados

En `submitAttempt` (quizzes.ts): antes de `generateCertificate`, se verifica si ya existe un certificado para `student_id + course_id`. Si existe, no se genera otro. La emisión manual desde el admin no tiene esta restricción.

---

## Consideraciones

1. **`NEXT_PUBLIC_APP_URL`** — Definir en producción para QR correcto.
2. **Bucket "library"** — PDFs en `library/certificates/{courseId}/{studentId}/{timestamp}.pdf`. Debe tener políticas públicas de lectura.
3. **Migración** — Ejecutar `app/migrations/12_certificate_updates.sql` en Supabase. Incluye la función `next_certificate_number()` que usa la secuencia `certificate_number_seq`.
4. **`ssr: false`** — Solo posible en Client Components. El wrapper `designer-loader.tsx` hace el dynamic import.

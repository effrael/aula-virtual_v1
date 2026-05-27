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
- `bwip-js` ^4.10.1 — **OBLIGATORIO** para que los QR/barcodes se rendericen en el servidor (Node.js). Sin este paquete el QR no aparece en el PDF.

**Why:** @pdfme/schemas usa `bwip-js` internamente (`bwipjs.toBuffer()` en server, `bwipjs.toCanvas()` en browser). Es un peer dependency que no se instala solo.

---

## Tablas (migración: `app/migrations/11_certificates.sql`)

### certificate_templates
- id (uuid, PK, default gen_random_uuid())
- name (text)
- description (text, nullable)
- pdf_url (text) — URL del PDF base subido al bucket "library"
- pdfme_template (jsonb, default '{}') — schema de campos guardado desde el designer
- created_at, deleted_at (soft delete)

### certificates
- id (uuid, PK)
- student_id (uuid, FK → profiles)
- course_id (uuid, FK → courses)
- template_id (uuid, FK → certificate_templates, nullable)
- verification_code (uuid, default gen_random_uuid()) — generado en el INSERT, usado para verificación pública
- pdf_url (text, nullable) — se llena DESPUÉS de generar el PDF
- score (int, nullable)
- issued_at (timestamptz, default now())

---

## Archivos del sistema

### Server Actions
- **`app/actions/certificate-templates.ts`** — CRUD de plantillas (getCertificateTemplates, createCertificateTemplate, updateCertificateTemplate, savePdfmeTemplate, deleteCertificateTemplate)
- **`app/actions/certificates.ts`** — Emisión y consulta de certificados

### Páginas
- **`app/dashboard/certificates/page.tsx`** — Server Component con vista dual:
  - Alumno: lista sus certificados con descarga y link verificación
  - Admin: KPIs, grid de plantillas, tabla emitidos, botones "Nueva plantilla" y "Emitir certificado"
- **`app/dashboard/certificates/[id]/designer/page.tsx`** — Server Component que carga la plantilla
- **`app/dashboard/certificates/[id]/designer/_components/designer-loader.tsx`** — Client Component wrapper que hace `dynamic(() => import("./template-designer"), { ssr: false })`
- **`app/dashboard/certificates/[id]/designer/_components/template-designer.tsx`** — Client Component con @pdfme/ui Designer
- **`app/verify/page.tsx`** — Formulario público para ingresar código
- **`app/verify/[code]/page.tsx`** — Página pública de verificación

### Componentes del diálogo
- **`_components/create-template-dialog.tsx`** — Crear plantilla (nombre, descripción, PDF base via MediaPicker)
- **`_components/issue-certificate-dialog.tsx`** — Emitir certificado manualmente (plantilla, alumno, curso, nota, campos dinámicos)
- **`_components/template-card.tsx`** — Tarjeta de plantilla con dropdown (Client Component para evitar hidratación)

---

## Campos dinámicos — cómo funciona

### Campos auto-llenados (desde la base de datos)
Estos campos se llenan automáticamente al emitir, no requieren input manual:

| Campo en el designer | Valor automático |
|---------------------|-----------------|
| `nombre` | `profiles.full_name` del alumno |
| `curso` | `courses.title` del curso |
| `fecha` | Fecha actual formateada (ej. "26 de mayo de 2026") |
| `nota` | Score del quiz o el que pone el admin |
| `codigo` | `certificates.verification_code` (UUID) |
| `qr` | URL de verificación: `{NEXT_PUBLIC_APP_URL}/verify/{verification_code}` |

### Campos personalizados
Cualquier campo creado en el designer que **NO** sea uno de los 6 auto-llenados aparece como input en el diálogo de emisión manual. Ejemplos: `dni`, `instructor`, `horas`, `institucion`.

### Flujo en el diálogo
1. Admin selecciona una plantilla → se leen los `fieldNames` del schema pdfme
2. Se filtran los auto-llenados (set: nombre, curso, fecha, nota, codigo, qr)
3. Los campos restantes aparecen como inputs obligatorios en la sección "Campos adicionales"
4. Al emitir, se pasan como `customInputs` a `generateCertificate`
5. En el action: `const inputs = [{ ...autoFields, ...(customInputs ?? {}) }]`

### Flujo en emisión automática (quiz)
- `submitAttempt` en `app/actions/quizzes.ts` llama `generateCertificate(studentId, courseId, score)` sin `templateId` ni `customInputs`
- Toma la primera plantilla disponible
- Los campos personalizados quedan vacíos (solo se llenan los auto)
- **Consideración:** Si la plantilla tiene campos custom obligatorios, estos quedarán vacíos en la emisión automática. Solo usar campos auto-llenados en plantillas destinadas a emisión automática.

---

## Generación del PDF — orden de operaciones

1. **INSERT** el certificado en BD (para obtener `verification_code`)
2. **Fetch** el PDF base desde la URL de la plantilla
3. **Construir inputs** mergeando auto-fields + custom inputs
4. **Generar PDF** con `@pdfme/generator` → `generate({ template, inputs, plugins })`
5. **Upload** al bucket "library" en `certificates/{courseId}/{studentId}/{timestamp}.pdf`
6. **UPDATE** el certificado con `pdf_url`

**Why del orden:** El verification_code se genera en el INSERT (default `gen_random_uuid()`), y se necesita ANTES de generar el PDF para que el QR apunte a la URL correcta.

---

## Designer (@pdfme/ui) — consideraciones

### Carga optimizada
- `template-designer.tsx` usa `Promise.all` para cargar en paralelo: `@pdfme/ui`, `@pdfme/schemas`, y el PDF base (fetch)
- Muestra spinner mientras carga
- El wrapper `designer-loader.tsx` hace `dynamic(() => import(...), { ssr: false })` porque @pdfme/ui necesita el DOM

### Next.js 16 — `ssr: false` solo en Client Components
- **NO** se puede usar `dynamic({ ssr: false })` en Server Components (error de build en Next.js 16)
- Solución: crear un Client Component wrapper (`designer-loader.tsx`) que hace el dynamic import, y el Server Component (`page.tsx`) importa ese wrapper normalmente

### Guardado del template
- Al guardar, se extrae `getTemplate()` del designer, se quita `basePdf` (pesado), y se guarda solo el schema en `pdfme_template` (jsonb) via `savePdfmeTemplate`
- Al cargar de nuevo el designer, se mergea el schema guardado con el basePdf (fetched de nuevo)

### Plugins registrados
```javascript
plugins: { text, image, ...barcodes }
// text → Plugin para campos de texto
// image → Plugin para imágenes
// ...barcodes → { qrcode, japanpost, ean13, code128, etc. }
```

---

## Verificación pública

- **`/verify`** — Formulario con input de código, redirige a `/verify/{code}`
- **`/verify/[code]`** — Muestra datos del certificado (alumno, curso, nota, fecha) o "no válido"
- **`middleware.ts`** — `/verify` excluido de la protección de auth
- QR en el certificado apunta a: `{NEXT_PUBLIC_APP_URL}/verify/{verification_code}`

---

## Consideraciones importantes

1. **Variable de entorno `NEXT_PUBLIC_APP_URL`** — Definir en producción para que los QR apunten al dominio correcto. Si no existe, usa `http://localhost:3000`.

2. **Bucket "library"** — Los PDFs de certificados se suben a `library/certificates/{courseId}/{studentId}/{timestamp}.pdf`. El bucket debe tener políticas públicas de lectura si se quiere que los PDFs sean descargables sin auth.

3. **Plantillas para emisión automática** — No deben tener campos personalizados, solo los 6 auto-llenados. Los campos custom quedan vacíos en la emisión automática por quiz.

4. **Hidratación** — Los componentes interactivos (DropdownMenu, Dialog) deben estar en Client Components. El `template-card.tsx` se extrajo como Client Component para evitar errores de hidratación en la página de certificados.

5. **Reiniciar dev server** — Después de instalar dependencias o cambiar la estructura de carpetas dinámicas `[id]`, hacer `rm -rf .next && pnpm dev` para limpiar caché de Turbopack.

6. **Migración SQL** — Ejecutar `app/migrations/11_certificates.sql` en Supabase antes de usar el sistema.

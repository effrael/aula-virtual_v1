# Módulo de Certificados — `/dashboard/certificates`

## Descripción general

Sistema completo de emisión, diseño y verificación de certificados digitales con PDF generado por `@pdfme`. Soporta emisión manual, masiva por Excel, y para personas externas no registradas.

---

## Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/dashboard/certificates` | admin, superadmin, docente, colaborador, alumno | Vista principal (bifurcada por rol) |
| `/dashboard/certificates/[id]/designer` | admin, superadmin, docente, colaborador | Editor de plantilla con `@pdfme/ui` |
| `/verify` | público | Formulario para ingresar código y verificar |
| `/verify/[code]` | público | Resultado de verificación por `certificate_code` |

---

## Vista por rol

### Alumno (`/dashboard/certificates`)
- Grid de sus certificados obtenidos
- Cada card muestra: curso, fecha de emisión, nota (si aplica)
- Botones: **Descargar PDF** y **Ver certificado** → `/verify/RC-XXXX-26`

### Admin / Docente / Colaborador
- KPIs: plantillas creadas, certificados emitidos, cursos con certificados
- Grid de plantillas con opciones: Diseñar, Renombrar, Eliminar
- Tabla paginada de certificados emitidos (5 por página, paginación server-side)
- Botones de acción: **Emitir certificado** y **Nueva plantilla**

---

## Plantillas de certificado

### Crear plantilla
1. Click en **Nueva plantilla**
2. Ingresar nombre, descripción opcional y subir el **PDF base** (desde la biblioteca `library`)
3. Al confirmar → redirige automáticamente al **Designer**

### Designer (`/dashboard/certificates/[id]/designer`)
- Usa `@pdfme/ui` (cargado dinámicamente, sin SSR)
- Campos auto-llenados disponibles: `nombre`, `apellidos`, `dni`, `codigo`, `qr`
- Campos custom: cualquier campo adicional que se agregue en el designer
- Soporte multi-hoja: panel para mover campos entre hojas del PDF
- Al guardar → persiste el JSON del template en `certificate_templates.pdfme_template`

### Editar / Eliminar plantilla
- Desde el menú `...` de cada `TemplateCard`
- Renombrar: cambia nombre y descripción
- Eliminar: soft-delete (`deleted_at`)

---

## Emisión de certificados

### Tab Manual
- Selecciona plantilla + alumno registrado + curso
- Muestra los campos del certificado editables antes de emitir (auto-fields + custom fields)
- Botón **Vista previa** → abre PDF en nueva pestaña sin guardar
- Al emitir → genera PDF, guarda en Supabase Storage, registra en `certificates`

### Tab Importar Excel
- Descarga plantilla `.xlsx` con columnas: `apellidos`, `nombre`, `dni`, `email`, `codigo`, + campos custom de la plantilla seleccionada
- Sube el archivo (`.xlsx` o `.csv`)
- Preview de las filas antes de emitir
- Al emitir en batch:
  - Si el alumno **existe por DNI** → emite certificado, envía PDF al email si viene en la fila
  - Si **no existe** y tiene `email` → crea cuenta inactiva, emite certificado, envía email con credenciales + PDF
  - Si **no existe** y sin `email` → marca fila como error
  - Si ya tiene certificado para ese curso → marca como error
- Muestra resultado por fila con íconos ✓/✗

### Tab Sin registro
- Para personas que no están en el aula
- Campos: apellidos, nombre, DNI, email (obligatorio), + campos custom de la plantilla
- Lógica de creación de usuario:
  1. Busca perfil por **DNI** en `profiles`
  2. Si no existe → busca email en `auth.users`
  3. Si tampoco existe en auth → crea usuario con `status: inactivo`, `role: alumno`
  4. Emite el certificado normalmente
- Envío de email:
  - **Usuario nuevo** → email con credenciales (correo + contraseña temporal) + PDF adjunto
  - **Usuario existente** → email solo con PDF adjunto

---

## Verificación pública

- URL: `/verify/RC-0001-26` (usando `certificate_code`, no el UUID)
- El QR impreso en el PDF apunta a esta URL
- Muestra: alumno, curso, nota, fecha de emisión, código
- Si el código no existe → pantalla de "Certificado no válido"

---

## Tablas en Supabase

### `certificate_templates`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | Nombre de la plantilla |
| `description` | text | Descripción opcional |
| `pdf_url` | text | URL del PDF base en Storage |
| `pdfme_template` | jsonb | JSON del diseño pdfme |
| `custom_fonts` | jsonb | Fuentes personalizadas |
| `deleted_at` | timestamptz | Soft-delete |

### `certificates`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `student_id` | uuid | FK → `profiles.id` |
| `course_id` | uuid | FK → `courses.id` |
| `template_id` | uuid | FK → `certificate_templates.id` |
| `certificate_code` | text | Código legible `RC-XXXX-YY` (usado para verificación) |
| `verification_code` | uuid | UUID interno (legacy, no se usa en URLs) |
| `pdf_url` | text | URL del PDF generado en Storage |
| `score` | int | Nota del quiz (nullable) |
| `issued_at` | timestamptz | Fecha de emisión |

---

## Generación del código de certificado

- Formato: `RC-{seq}-{año}` → ej: `RC-0042-26`
- `seq` = último número de certificado del año + 1, con padding de 4 dígitos
- Si no hay certificados previos en el año → empieza en `0001`

---

## Email

Usa **nodemailer + Gmail** (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM`).

| Evento | Asunto | Contenido |
|---|---|---|
| Certificado a usuario existente | `Tu certificado — {curso}` | Felicitaciones + PDF adjunto |
| Certificado a usuario nuevo | `Tu certificado — {curso}` | Felicitaciones + credenciales de acceso + PDF adjunto |

El PDF se adjunta descargándolo como buffer desde su URL en Storage. Si falla la descarga, el email se envía igual sin adjunto.

---

## Archivos principales

| Archivo | Descripción |
|---|---|
| `app/dashboard/certificates/page.tsx` | Página principal, bifurcación por rol |
| `app/dashboard/certificates/[id]/designer/page.tsx` | Página del designer |
| `app/dashboard/certificates/[id]/designer/_components/template-designer.tsx` | Editor pdfme |
| `app/dashboard/certificates/_components/create-template-dialog.tsx` | Dialog nueva plantilla |
| `app/dashboard/certificates/_components/issue-certificate-dialog.tsx` | Dialog emitir (Manual / Excel / Sin registro) |
| `app/dashboard/certificates/_components/issued-certificates-table.tsx` | Tabla paginada (server-side) |
| `app/dashboard/certificates/_components/template-card.tsx` | Card de plantilla con acciones |
| `app/verify/page.tsx` | Formulario de verificación pública |
| `app/verify/[code]/page.tsx` | Resultado de verificación |
| `app/actions/certificates.ts` | Todos los server actions del módulo |
| `app/actions/certificate-templates.ts` | Actions de plantillas |
| `lib/email.ts` | `sendCertificateEmail`, `sendWelcomeEmail`, `sendPasswordResetEmail` |

---


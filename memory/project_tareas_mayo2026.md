---
name: Tareas implementadas mayo 2026
description: 5 tareas grandes implementadas el 25-26 mayo 2026 — protección de rutas, activar usuario, certificados con @pdfme, dashboard real, evaluaciones alumno
type: project
---

## TAREA 1 — Protección de rutas por rol

**Why:** El middleware solo verificaba sesión, no rol. Un alumno podía acceder a cualquier ruta del dashboard por URL.

**How to apply:** Ahora todas las rutas sensibles verifican el rol del usuario antes de renderizar.

### 1a. Protección en Server Components
- Creado `lib/auth-guard.ts` con dos helpers:
  - `requireRole(allowedRoles)` — lee rol del usuario, si no tiene permiso redirige a `/dashboard/courses`
  - `getActionRole()` — retorna el rol desde server action context (sin redirect)
- Páginas protegidas:
  - `app/dashboard/users/page.tsx` → admin, superadmin, colaborador
  - `app/dashboard/users/doc/page.tsx` → admin, superadmin, colaborador
  - `app/dashboard/users/alumnos/page.tsx` → admin, superadmin, colaborador
  - `app/dashboard/users/colaboradores/page.tsx` → admin, superadmin, colaborador
  - `app/dashboard/settings/organization/page.tsx` → admin, superadmin
  - `app/dashboard/settings/integrations/page.tsx` → admin, superadmin
  - `app/dashboard/ads/page.tsx` → todos excepto alumno
  - `app/dashboard/certificates/page.tsx` → tiene lógica inline (alumno ve su vista, otros ven admin)

### 1b. Protección en Server Actions
- `app/actions/users.ts` — createUser, updateUser, deleteUser, changeUserRole: solo admin/superadmin/colaborador
- `app/actions/courses.ts` — createCourse, deleteCourse: solo admin/superadmin
- `app/actions/modules.ts` — todas las funciones: rol !== alumno (helper `requireNotAlumno()`)
- `app/actions/announcements.ts` — saveAnnouncement, sendAnnouncement, archiveAnnouncement, deleteAnnouncement, duplicateAnnouncement: rol !== alumno

---

## TAREA 2 — Activar usuario inactivo

**Why:** Solo existían acciones Editar, Cambiar rol, Eliminar. No había forma de reactivar un usuario inactivo.

**How to apply:** Nuevo action + UI condicional en el dropdown de la tabla de usuarios.

### Archivos modificados:
- `app/actions/users.ts` — nueva función `activateUser(userId)`:
  - UPDATE profiles SET status="activo", deleted_at=null
  - supabaseAdmin.auth.admin.updateUserById con ban_duration: "none"
  - revalidatePath("/dashboard/users", "layout")
- `app/dashboard/users/_components/users-table.tsx`:
  - Si user.status === "inactivo": muestra "Activar" (icono UserCheck, color verde)
  - Si user.status === "activo": muestra "Eliminar" (como antes)
  - Usa toast de sonner para feedback

---

## TAREA 3 — Sistema de certificados con @pdfme

**Why:** La página de certificados era estática con datos hardcodeados. Necesitaba sistema completo de plantillas, generación de PDF y verificación pública.

**How to apply:** Sistema completo con emisión automática (quiz) y manual (admin). Requiere ejecutar migración SQL.

### Dependencias instaladas:
- `@pdfme/generator`, `@pdfme/common`, `@pdfme/schemas`
- Falta instalar `@pdfme/ui` para el designer (pnpm add @pdfme/ui)

### Migración:
- `app/migrations/11_certificates.sql` — tablas `certificate_templates` y `certificates` con índices

### Server Actions creados:
- `app/actions/certificate-templates.ts`:
  - getCertificateTemplates, createCertificateTemplate, updateCertificateTemplate, savePdfmeTemplate, deleteCertificateTemplate
- `app/actions/certificates.ts`:
  - generateCertificate(studentId, courseId, score) — busca template, genera PDF si hay diseño pdfme, sube al bucket "library", inserta registro
  - getCertificatesByStudent, getCertificateByCode, getIssuedCertificates, getCertificatesStats

### Emisión automática:
- `app/actions/quizzes.ts` (submitAttempt) — después de marcar lección completada, si passed && is_certification, obtiene course_id via lessons→modules→courses y llama generateCertificate

### Emisión manual:
- `app/dashboard/certificates/_components/issue-certificate-dialog.tsx` — dialog con búsqueda de alumno, curso y nota. Llama generateCertificate directamente.

### Páginas:
- `app/dashboard/certificates/page.tsx` — reescrito completamente:
  - Vista alumno: lista sus certificados con descarga PDF y link a verificación
  - Vista admin: KPIs reales, grid de plantillas, tabla de certificados emitidos, botones "Nueva plantilla" y "Emitir certificado"
- `app/dashboard/certificates/_components/create-template-dialog.tsx` — crea plantilla con nombre, descripción y PDF base (usa MediaPicker)
- `app/dashboard/certificates/[id]/designer/page.tsx` — Server Component que carga plantilla y renderiza TemplateDesigner
- `app/dashboard/certificates/[id]/designer/_components/template-designer.tsx` — Client Component, importa @pdfme/ui Designer con dynamic ssr:false, botón guardar diseño

### Verificación pública:
- `app/verify/page.tsx` — formulario para ingresar código de verificación
- `app/verify/_components/verify-form.tsx` — client component con input y redirect a /verify/[code]
- `app/verify/[code]/page.tsx` — muestra datos del certificado o "no válido", logo de org, botón descargar PDF
- `middleware.ts` — agregado bypass para /verify (no requiere auth)

### Sidebar:
- `components/app-sidebar.tsx` — link "Verificar Certificado" cambiado de /dashboard/certificates/verify a /verify

### Certificado sin PDF:
- Si no hay plantilla con diseño pdfme, se crea el registro en BD igualmente con verification_code
- La verificación pública funciona sin PDF (muestra datos del certificado)
- El botón "Descargar PDF" solo aparece si pdf_url no es null

---

## TAREA 4 — Dashboard métricas reales

**Why:** Los KPIs y tablas del dashboard estaban hardcodeados con datos estáticos.

**How to apply:** Query real con Promise.all, datos dinámicos.

### Archivos:
- `lib/queries/dashboard.ts` — getDashboardStats() ejecuta en paralelo:
  - count profiles role=alumno (deleted_at null)
  - count profiles role=docente (deleted_at null)
  - count courses status=publicado (deleted_at null)
  - count courses status=borrador (deleted_at null)
  - count certificates (total emitidos)
  - últimos 5 usuarios (id, full_name, role, created_at)
  - top cursos por enrollments (join con profiles para teacher name)
- `app/dashboard/page.tsx` — reescrito:
  - KPIs: Total alumnos, Docentes, Cursos publicados, Certificados emitidos
  - Tabla usuarios recientes con timeAgo()
  - Tabla cursos más inscritos
  - Acciones rápidas con Links reales (usuarios, cursos, organización, certificados)

---

## TAREA 5 — Página /dashboard/evaluaciones (alumno)

**Why:** El alumno no tenía vista consolidada de sus evaluaciones/quizzes.

**How to apply:** Nueva página que lista todos los quizzes de cursos inscritos con estado.

### Archivo:
- `app/dashboard/evaluaciones/page.tsx` — Server Component:
  - Lee enrollments del alumno
  - Busca lessons tipo quiz de esos cursos (join lessons→modules→courses)
  - Para cada quiz: obtiene intentos del alumno (quiz_attempts)
  - Muestra tabla con: nombre evaluación, curso, estado (Pendiente/Aprobado/No aprobado con score), intentos usados/máx, link a la lección
  - El sidebar del alumno ya tenía el link a /dashboard/evaluaciones

---
name: Sistema de Anuncios / Comunicación
description: Estado actual del módulo de anuncios (/dashboard/ads) y tareas pendientes
type: project
---

## Lo que se implementó

### Base de datos
- `app/migrations/10_announcements.sql` — tablas `announcements` + `announcement_reads`
- `app/migrations/10b_announcements_banner.sql` — ALTER para agregar columnas banner/CTA a quienes corrieron la migración original sin ellas

Columnas clave de `announcements`:
- `type`: urgente | informativo | recordatorio
- `status`: borrador | enviado | programado | archivado
- `target_type`: todos | rol | curso
- `target_role`, `target_course_id`
- `channels`: array (app | email | whatsapp)
- `scheduled_at`, `sent_at`
- `banner_url`, `banner_link` — imagen opcional con enlace
- `cta_text`, `cta_url` — botón CTA opcional

### Archivos creados
- `lib/queries/announcements.ts` — `getAnnouncements()` con conteo de lecturas
- `app/actions/announcements.ts` — saveAnnouncement, sendAnnouncement, archiveAnnouncement, deleteAnnouncement, duplicateAnnouncement, markAnnouncementRead, markAllAnnouncementsRead, getUnreadAnnouncementsForUser
- `components/rich-text-editor.tsx` — editor contentEditable sin deps externas (Bold, Italic, listas, Link)
- `app/dashboard/ads/page.tsx` — Server component
- `app/dashboard/ads/_components/announcements-table.tsx` — tabla con filtros + acciones
- `app/dashboard/ads/_components/announcement-form-dialog.tsx` — form con borrador/enviar/programar via requestSubmit() + intentRef
- `app/dashboard/ads/_components/announcement-detail-dialog.tsx` — vista detalle
- `components/notifications-bell.tsx` — campana con Realtime subscription + dropdown
- `components/announcement-banner.tsx` — urgente=modal bloqueante, informativo=banner fijo, recordatorio=toast Sonner

### Integrado en layout
- `app/dashboard/layout.tsx` — NotificationsBell (top-right absoluto) + AnnouncementBanner

---

## Pendiente / Lo que falta

1. **Envío real por email/WhatsApp** — actualmente los canales se guardan en DB pero no hay integración con servicio de email (Resend/SendGrid) ni WhatsApp API. Solo funciona el canal "app".

2. **Filtrado por destinatarios en la campana y banner** — `getUnreadAnnouncementsForUser` filtra por `target_type` pero el filtro de `target_role` y `target_course_id` depende de que el perfil del usuario esté disponible server-side. Verificar que funciona correctamente para alumnos inscritos en un curso específico.

3. **Sidebar role-based** — Se intentó 3 veces y se revirtió 2 veces. Actualmente el sidebar está sin filtrado por rol (hardcoded con todos los ítems). El usuario lo pidió explícitamente: admin=todo, docente=Cursos(Catálogo)+Anuncios, alumno=Mis cursos/Evaluaciones/Certificados. La implementación correcta es SOLO modificar `app-sidebar.tsx` usando `useAuthStore` — NO tocar `store/auth.ts` ni `auth-provider.tsx`.

4. **NavUser con datos reales** — el NavUser muestra "Efrael Villanueva" / "efrael2001@gmail.com" hardcodeado. Debería leer del `useAuthStore` (profile.full_name) y del `supabase.auth.getSession()` para el email.

5. **Página de detalle de anuncio** — solo existe dialog, no hay ruta `/dashboard/ads/[id]`.

6. **Programación real (cron)** — anuncios con `status=programado` y `scheduled_at` no se envían automáticamente; falta un cron job o edge function en Supabase.

**Why:** El usuario quiere una plataforma LMS completa. Los anuncios reemplazan la integración con Google Meet (el usuario decidió usar anuncios + enlaces en lugar de integración directa).
**How to apply:** Al retomar trabajo en `/dashboard/ads` o notificaciones, partir de estos archivos ya creados y no recrearlos.

# Sistema de Anuncios / Comunicación

## Base de datos

- `app/migrations/10_announcements.sql` — tablas `announcements` + `announcement_reads`
- `app/migrations/10b_announcements_banner.sql` — ALTER para agregar columnas banner/CTA a quienes corrieron la migración original sin ellas

Columnas clave de `announcements`:

| Columna | Tipo | Descripción |
|---|---|---|
| `type` | enum | urgente \| informativo \| recordatorio |
| `status` | enum | borrador \| enviado \| programado \| archivado |
| `target_type` | enum | todos \| rol \| curso |
| `target_role` | text | rol destino si target_type = rol |
| `target_course_id` | uuid | curso destino si target_type = curso |
| `channels` | text[] | app \| email \| whatsapp |
| `scheduled_at` | timestamptz | fecha de envío programado |
| `sent_at` | timestamptz | fecha real de envío |
| `banner_url` | text | imagen del banner (opcional) |
| `banner_link` | text | enlace al hacer clic en el banner |
| `cta_text` | text | texto del botón CTA |
| `cta_url` | text | URL del botón CTA |

## Archivos implementados

```
lib/queries/announcements.ts                          — getAnnouncements() con conteo de lecturas
app/actions/announcements.ts                          — saveAnnouncement, sendAnnouncement,
                                                        archiveAnnouncement, deleteAnnouncement,
                                                        duplicateAnnouncement, markAnnouncementRead,
                                                        markAllAnnouncementsRead,
                                                        getUnreadAnnouncementsForUser
components/rich-text-editor.tsx                       — editor contentEditable sin deps externas
                                                        (Bold, Italic, listas, Link)
app/dashboard/ads/page.tsx                            — Server component
app/dashboard/ads/_components/announcements-table.tsx — tabla con filtros + acciones dropdown
app/dashboard/ads/_components/announcement-form-dialog.tsx — form con borrador/enviar/programar
                                                        via requestSubmit() + intentRef
app/dashboard/ads/_components/announcement-detail-dialog.tsx — vista detalle
components/notifications-bell.tsx                     — campana con Realtime subscription + dropdown
components/announcement-banner.tsx                    — urgente=modal bloqueante,
                                                        informativo=banner fijo,
                                                        recordatorio=toast Sonner
```

`app/dashboard/layout.tsx` — integra `NotificationsBell` (top-right absoluto) + `AnnouncementBanner`

## Comportamiento de banners por tipo

| Tipo | Comportamiento |
|---|---|
| urgente | Modal bloqueante con overlay, no se cierra clickando fuera |
| informativo | Banner fijo en la parte superior, "Ver más" abre detalle |
| recordatorio | Toast de Sonner con botón CTA opcional |

Los anuncios se muestran en cola: urgente/informativo uno a la vez, recordatorios se disparan de inmediato como toasts.

## Pendiente

1. **Envío real por email/WhatsApp** — los canales se guardan en DB pero no hay integración con Resend/SendGrid ni WhatsApp API. Solo el canal "app" funciona hoy.

2. **Filtrado de destinatarios** — `getUnreadAnnouncementsForUser` filtra por `target_type` pero el filtro de `target_role` y `target_course_id` depende del perfil del usuario. Verificar para alumnos inscritos en cursos específicos.

3. **Ruta de detalle** `/dashboard/ads/[id]` — solo existe dialog, no hay página independiente.

4. **Cron job para anuncios programados** — anuncios con `status=programado` y `scheduled_at` no se envían automáticamente. Falta edge function en Supabase o cron externo.

5. **NavUser con datos reales** — actualmente muestra nombre/email hardcodeado. Debería leer de `useAuthStore` (profile.full_name) y `supabase.auth.getSession()` para el email.

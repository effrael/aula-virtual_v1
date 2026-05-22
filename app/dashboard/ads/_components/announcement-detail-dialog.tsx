"use client";

import { Info, AlertTriangle, Bell, Monitor, Mail, Users, BookOpen, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AnnouncementRow, AnnouncementType, AnnouncementStatus, TargetType } from "@/lib/queries/announcements";

type Props = {
  announcement: AnnouncementRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const typeConfig: Record<AnnouncementType, { label: string; icon: React.ReactNode; classes: string }> = {
  informativo:  { label: "Informativo",  icon: <Info className="size-4" />,          classes: "text-blue-700 bg-blue-50 border-blue-200" },
  urgente:      { label: "Urgente",      icon: <AlertTriangle className="size-4" />, classes: "text-red-700 bg-red-50 border-red-200" },
  recordatorio: { label: "Recordatorio", icon: <Bell className="size-4" />,          classes: "text-amber-700 bg-amber-50 border-amber-200" },
};

const statusConfig: Record<AnnouncementStatus, { label: string; classes: string }> = {
  enviado:    { label: "Enviado",    classes: "text-green-700 bg-green-100" },
  programado: { label: "Programado", classes: "text-blue-700 bg-blue-100" },
  borrador:   { label: "Borrador",   classes: "text-neutral-600 bg-neutral-100" },
  archivado:  { label: "Archivado",  classes: "text-neutral-500 bg-neutral-100" },
};

const targetLabel: Record<TargetType, string> = {
  todos:    "Todos los usuarios",
  alumnos:  "Solo alumnos",
  docentes: "Solo docentes",
  curso:    "Curso específico",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export function AnnouncementDetailDialog({ announcement, open, onOpenChange }: Props) {
  if (!announcement) return null;

  const type   = typeConfig[announcement.type];
  const status = statusConfig[announcement.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">{announcement.title}</DialogTitle>
        </DialogHeader>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${type.classes}`}>
            {type.icon}
            {type.label}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.classes}`}>
            {status.label}
          </span>
        </div>

        {/* Contenido renderizado */}
        <div className="border border-[var(--color-neutral-200)] rounded-lg p-4 bg-white">
          <div
            className="text-sm text-[var(--color-neutral-900)] leading-relaxed
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
              [&_li]:my-0.5
              [&_a]:text-blue-600 [&_a]:underline
              [&_b]:font-semibold [&_strong]:font-semibold
              [&_i]:italic [&_em]:italic"
            dangerouslySetInnerHTML={{ __html: announcement.content }}
          />
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Destinatarios */}
          <div className="flex flex-col gap-1 p-3 rounded-lg bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)]">
            <p className="text-xs font-medium text-[var(--color-neutral-500)] flex items-center gap-1">
              <Users className="size-3.5" /> Destinatarios
            </p>
            <p className="text-sm text-[var(--color-neutral-900)]">
              {announcement.target_type === "curso" && announcement.target_course_title
                ? announcement.target_course_title
                : targetLabel[announcement.target_type]}
            </p>
            {announcement.target_type === "curso" && (
              <p className="text-xs text-[var(--color-neutral-500)] flex items-center gap-1 mt-0.5">
                <BookOpen className="size-3" /> Curso específico
              </p>
            )}
          </div>

          {/* Leídos */}
          <div className="flex flex-col gap-1 p-3 rounded-lg bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)]">
            <p className="text-xs font-medium text-[var(--color-neutral-500)] flex items-center gap-1">
              <Eye className="size-3.5" /> Lecturas
            </p>
            <p className="text-2xl font-bold text-[var(--color-neutral-900)]">
              {announcement.read_count}
            </p>
            <p className="text-xs text-[var(--color-neutral-500)]">usuarios han leído</p>
          </div>

          {/* Canales */}
          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)]">
            <p className="text-xs font-medium text-[var(--color-neutral-500)]">Canales</p>
            <div className="flex flex-col gap-1">
              {announcement.channel_platform && (
                <span className="flex items-center gap-1.5 text-sm text-[var(--color-neutral-700)]">
                  <Monitor className="size-3.5" /> Plataforma
                </span>
              )}
              {announcement.channel_email && (
                <span className="flex items-center gap-1.5 text-sm text-[var(--color-neutral-700)]">
                  <Mail className="size-3.5" /> Email
                </span>
              )}
            </div>
          </div>

          {/* Fechas */}
          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)]">
            <p className="text-xs font-medium text-[var(--color-neutral-500)]">Fechas</p>
            <div className="flex flex-col gap-1 text-xs text-[var(--color-neutral-700)]">
              <span>Creado: {formatDate(announcement.created_at)}</span>
              {announcement.sent_at && <span>Enviado: {formatDate(announcement.sent_at)}</span>}
              {announcement.send_at && !announcement.sent_at && (
                <span>Programado: {formatDate(announcement.send_at)}</span>
              )}
              {announcement.created_by_name && (
                <span className="mt-1 text-[var(--color-neutral-500)]">
                  Por: {announcement.created_by_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

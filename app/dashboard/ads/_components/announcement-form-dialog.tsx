"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Info, AlertTriangle, Bell, Monitor, Mail, Calendar, ImageIcon, MousePointerClick } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/rich-text-editor";
import { saveAnnouncement, type AnnouncementFormState } from "@/app/actions/announcements";
import type { AnnouncementRow, AnnouncementType, TargetType } from "@/lib/queries/announcements";

type Props = {
  announcement?: AnnouncementRow;
  courses: { id: string; title: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const typeOptions: { value: AnnouncementType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "informativo", label: "Informativo", icon: <Info className="size-4" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "urgente",     label: "Urgente",     icon: <AlertTriangle className="size-4" />, color: "text-red-600 bg-red-50 border-red-200" },
  { value: "recordatorio",label: "Recordatorio",icon: <Bell className="size-4" />, color: "text-amber-600 bg-amber-50 border-amber-200" },
];

const targetOptions: { value: TargetType; label: string }[] = [
  { value: "todos",    label: "Todos los usuarios" },
  { value: "alumnos",  label: "Solo alumnos" },
  { value: "docentes", label: "Solo docentes" },
  { value: "curso",    label: "Por curso específico" },
];

export function AnnouncementFormDialog({ announcement, courses, open, onOpenChange }: Props) {
  const isEdit = !!announcement;

  const [state, formAction, pending] = useActionState<AnnouncementFormState, FormData>(
    saveAnnouncement,
    undefined
  );

  const [type, setType] = useState<AnnouncementType>(announcement?.type ?? "informativo");
  const [targetType, setTargetType] = useState<TargetType>(announcement?.target_type ?? "todos");
  const [schedulingMode, setSchedulingMode] = useState<"inmediato" | "programar">(
    announcement?.status === "programado" ? "programar" : "inmediato"
  );
  const [channelPlatform, setChannelPlatform] = useState(announcement?.channel_platform ?? true);
  const [channelEmail, setChannelEmail] = useState(announcement?.channel_email ?? false);
  const [titleLength, setTitleLength] = useState(announcement?.title.length ?? 0);

  const formRef = useRef<HTMLFormElement>(null);
  const intentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success(isEdit ? "Anuncio actualizado." : "Anuncio guardado.");
      onOpenChange(false);
    }
    if (state?.message) toast.error(state.message);
  }, [state]);

  function submit(intent: "borrador" | "enviar" | "programar") {
    if (intentRef.current) intentRef.current.value = intent;
    formRef.current?.requestSubmit();
  }

  const canEdit = !announcement || announcement.status === "borrador" || announcement.status === "programado";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar anuncio" : "Nuevo anuncio"}</DialogTitle>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="flex flex-col gap-5 pt-1">
          {/* Hidden fields */}
          {isEdit && <input type="hidden" name="id" value={announcement.id} />}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="channel_platform" value={String(channelPlatform)} />
          <input type="hidden" name="channel_email" value={String(channelEmail)} />
          <input type="hidden" name="intent" ref={intentRef} defaultValue="borrador" />

          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="ann-title" className="text-sm font-medium text-[var(--color-neutral-900)]">
                Título <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs ${titleLength > 130 ? "text-red-500" : "text-[var(--color-neutral-400)]"}`}>
                {titleLength}/150
              </span>
            </div>
            <Input
              id="ann-title"
              name="title"
              maxLength={150}
              defaultValue={announcement?.title}
              placeholder="Ej. Mantenimiento programado del sistema"
              disabled={pending || !canEdit}
              onChange={(e) => setTitleLength(e.target.value.length)}
              autoFocus
            />
            {state?.errors?.title && (
              <p className="text-xs text-red-500">{state.errors.title[0]}</p>
            )}
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-[var(--color-neutral-900)]">Tipo</p>
            <div className="flex gap-2 flex-wrap">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={pending || !canEdit}
                  onClick={() => setType(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all
                    ${type === opt.value ? opt.color : "border-[var(--color-neutral-200)] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-50)]"}
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-neutral-900)]">
              Contenido <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              name="content"
              defaultValue={announcement?.content}
              placeholder="Escribe el mensaje del anuncio..."
              disabled={pending || !canEdit}
            />
            {state?.errors?.content && (
              <p className="text-xs text-red-500">{state.errors.content[0]}</p>
            )}
          </div>

          {/* Destinatarios */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-[var(--color-neutral-900)]">Destinatarios</p>
            <div className="grid grid-cols-2 gap-2">
              {targetOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors
                    ${targetType === opt.value
                      ? "border-primary bg-primary/5 text-[var(--color-neutral-900)]"
                      : "border-[var(--color-neutral-200)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-50)]"}
                    ${(pending || !canEdit) ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <input
                    type="radio"
                    className="accent-primary"
                    checked={targetType === opt.value}
                    onChange={() => setTargetType(opt.value)}
                    disabled={pending || !canEdit}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {/* Selector de curso */}
            {targetType === "curso" && (
              <div className="flex flex-col gap-1.5 mt-1">
                <select
                  name="target_course_id"
                  defaultValue={announcement?.target_course_id ?? ""}
                  disabled={pending || !canEdit}
                  className="h-9 w-full rounded-md border border-[var(--color-neutral-200)] bg-white px-3 text-sm text-[var(--color-neutral-900)] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                >
                  <option value="">Selecciona un curso...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                {state?.errors?.target_type && (
                  <p className="text-xs text-red-500">{state.errors.target_type[0]}</p>
                )}
              </div>
            )}
          </div>

          {/* Canales */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-[var(--color-neutral-900)]">Canales de envío</p>
            <div className="flex flex-col gap-2">
              <label className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors
                ${channelPlatform ? "border-primary bg-primary/5" : "border-[var(--color-neutral-200)] hover:bg-[var(--color-neutral-50)]"}
                ${(pending || !canEdit) ? "opacity-50 pointer-events-none" : ""}`}>
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={channelPlatform}
                  onChange={(e) => setChannelPlatform(e.target.checked)}
                  disabled={pending || !canEdit}
                />
                <Monitor className="size-4 text-[var(--color-neutral-500)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--color-neutral-900)]">Notificación en plataforma</p>
                  <p className="text-xs text-[var(--color-neutral-500)]">Aparece en la campana del usuario</p>
                </div>
              </label>

              <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--color-neutral-200)] opacity-50 cursor-not-allowed">
                <input type="checkbox" disabled checked={false} />
                <Mail className="size-4 text-[var(--color-neutral-500)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--color-neutral-900)]">Correo electrónico</p>
                  <p className="text-xs text-[var(--color-neutral-400)]">Próximamente</p>
                </div>
              </label>
            </div>
            {state?.errors?.channels && (
              <p className="text-xs text-red-500">{state.errors.channels[0]}</p>
            )}
          </div>

          {/* Programación */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-[var(--color-neutral-900)]">Programación</p>
            <div className="flex flex-col gap-2">
              <label className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors
                ${schedulingMode === "inmediato" ? "border-primary bg-primary/5" : "border-[var(--color-neutral-200)] hover:bg-[var(--color-neutral-50)]"}
                ${(pending || !canEdit) ? "opacity-50 pointer-events-none" : ""}`}>
                <input
                  type="radio"
                  className="accent-primary"
                  checked={schedulingMode === "inmediato"}
                  onChange={() => setSchedulingMode("inmediato")}
                  disabled={pending || !canEdit}
                />
                Enviar inmediatamente
              </label>

              <label className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors
                ${schedulingMode === "programar" ? "border-primary bg-primary/5" : "border-[var(--color-neutral-200)] hover:bg-[var(--color-neutral-50)]"}
                ${(pending || !canEdit) ? "opacity-50 pointer-events-none" : ""}`}>
                <input
                  type="radio"
                  className="accent-primary"
                  checked={schedulingMode === "programar"}
                  onChange={() => setSchedulingMode("programar")}
                  disabled={pending || !canEdit}
                />
                <Calendar className="size-4 text-[var(--color-neutral-500)]" />
                Programar para fecha específica
              </label>

              {schedulingMode === "programar" && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <input
                    type="datetime-local"
                    name="send_at"
                    defaultValue={announcement?.send_at?.slice(0, 16)}
                    disabled={pending || !canEdit}
                    className="h-9 w-full rounded-md border border-[var(--color-neutral-200)] bg-white px-3 text-sm text-[var(--color-neutral-900)] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  />
                  {state?.errors?.send_at && (
                    <p className="text-xs text-red-500">{state.errors.send_at[0]}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Banner opcional */}
          <div className="flex flex-col gap-3 p-4 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-[var(--color-neutral-500)]" />
              <p className="text-sm font-medium text-[var(--color-neutral-900)]">Banner (opcional)</p>
              <span className="text-xs text-[var(--color-neutral-400)]">— imagen que acompaña al anuncio</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-neutral-600)]">URL de la imagen</label>
              <Input
                name="banner_url"
                type="url"
                placeholder="https://ejemplo.com/imagen.jpg"
                defaultValue={announcement?.banner_url ?? ""}
                disabled={pending || !canEdit}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-neutral-600)]">
                Enlace al hacer clic en la imagen{" "}
                <span className="text-[var(--color-neutral-400)] font-normal">(opcional)</span>
              </label>
              <Input
                name="banner_link"
                type="url"
                placeholder="https://ejemplo.com"
                defaultValue={announcement?.banner_link ?? ""}
                disabled={pending || !canEdit}
              />
            </div>
          </div>

          {/* CTA opcional */}
          <div className="flex flex-col gap-3 p-4 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]">
            <div className="flex items-center gap-2">
              <MousePointerClick className="size-4 text-[var(--color-neutral-500)]" />
              <p className="text-sm font-medium text-[var(--color-neutral-900)]">Botón CTA (opcional)</p>
              <span className="text-xs text-[var(--color-neutral-400)]">— aparece al final del anuncio</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--color-neutral-600)]">Texto del botón</label>
                <Input
                  name="cta_text"
                  placeholder="Más información"
                  maxLength={80}
                  defaultValue={announcement?.cta_text ?? ""}
                  disabled={pending || !canEdit}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--color-neutral-600)]">URL de destino</label>
                <Input
                  name="cta_url"
                  type="url"
                  placeholder="https://ejemplo.com"
                  defaultValue={announcement?.cta_url ?? ""}
                  disabled={pending || !canEdit}
                />
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--color-neutral-100)]">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => submit("borrador")}
                >
                  {pending && intentRef.current?.value === "borrador" && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Guardar borrador
                </Button>
              )}

              {canEdit && (
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    submit(schedulingMode === "programar" ? "programar" : "enviar")
                  }
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {schedulingMode === "programar" ? "Programar" : "Enviar"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

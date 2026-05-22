"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Info, AlertTriangle, Bell, Monitor, Mail, Eye,
  Pencil, Copy, Archive, Trash2, Send, MoreHorizontal, Plus, Search, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  sendAnnouncement,
  archiveAnnouncement,
  deleteAnnouncement,
  duplicateAnnouncement,
} from "@/app/actions/announcements";
import { AnnouncementFormDialog } from "./announcement-form-dialog";
import { AnnouncementDetailDialog } from "./announcement-detail-dialog";
import type {
  AnnouncementRow,
  AnnouncementType,
  AnnouncementStatus,
} from "@/lib/queries/announcements";

type Props = {
  announcements: AnnouncementRow[];
  courses: { id: string; title: string }[];
};

// ── Config visual ──────────────────────────────────────────────────────────────

const typeConfig: Record<AnnouncementType, { label: string; icon: React.ReactNode; classes: string }> = {
  informativo:  { label: "Informativo",  icon: <Info className="size-3.5" />,          classes: "text-blue-700 bg-blue-50" },
  urgente:      { label: "Urgente",      icon: <AlertTriangle className="size-3.5" />, classes: "text-red-700 bg-red-50" },
  recordatorio: { label: "Recordatorio", icon: <Bell className="size-3.5" />,          classes: "text-amber-700 bg-amber-50" },
};

const statusConfig: Record<AnnouncementStatus, { label: string; classes: string }> = {
  enviado:    { label: "Enviado",    classes: "text-green-700 bg-green-100" },
  programado: { label: "Programado", classes: "text-blue-700 bg-blue-100" },
  borrador:   { label: "Borrador",   classes: "text-neutral-600 bg-neutral-100" },
  archivado:  { label: "Archivado",  classes: "text-neutral-500 bg-neutral-200" },
};

const STATUS_FILTERS: { value: AnnouncementStatus | "todos"; label: string }[] = [
  { value: "todos",     label: "Todos" },
  { value: "enviado",   label: "Enviados" },
  { value: "programado",label: "Programados" },
  { value: "borrador",  label: "Borradores" },
  { value: "archivado", label: "Archivados" },
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(iso));
}

function targetLabel(a: AnnouncementRow) {
  if (a.target_type === "todos")    return "Todos";
  if (a.target_type === "alumnos")  return "Alumnos";
  if (a.target_type === "docentes") return "Docentes";
  if (a.target_type === "curso")    return a.target_course_title ?? "Curso";
  return "—";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AnnouncementsTable({ announcements, courses }: Props) {
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | "todos">("todos");
  const [typeFilter, setTypeFilter]     = useState<AnnouncementType | "todos">("todos");

  const [formOpen, setFormOpen]                 = useState(false);
  const [editingAnn, setEditingAnn]             = useState<AnnouncementRow | null>(null);
  const [detailAnn, setDetailAnn]               = useState<AnnouncementRow | null>(null);
  const [detailOpen, setDetailOpen]             = useState(false);
  const [deleteTarget, setDeleteTarget]         = useState<AnnouncementRow | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [, startTransition] = useTransition();

  // ── Filtrado ───────────────────────────────────────────────────────────────

  const filtered = announcements.filter((a) => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "todos" && a.status !== statusFilter) return false;
    if (typeFilter   !== "todos" && a.type   !== typeFilter)   return false;
    return true;
  });

  const hasFilters = search || statusFilter !== "todos" || typeFilter !== "todos";

  // ── Acciones ───────────────────────────────────────────────────────────────

  function handleSend(a: AnnouncementRow) {
    startTransition(async () => {
      const res = await sendAnnouncement(a.id);
      if (res.success) toast.success("Anuncio enviado.");
      else toast.error(res.message ?? "Error al enviar.");
    });
  }

  function handleArchive(a: AnnouncementRow) {
    startTransition(async () => {
      const res = await archiveAnnouncement(a.id);
      if (res.success) toast.success("Anuncio archivado.");
      else toast.error(res.message ?? "Error al archivar.");
    });
  }

  function handleDuplicate(a: AnnouncementRow) {
    startTransition(async () => {
      const res = await duplicateAnnouncement(a.id);
      if (res.success) toast.success("Anuncio duplicado como borrador.");
      else toast.error(res.message ?? "Error al duplicar.");
    });
  }

  function handleDelete(a: AnnouncementRow) {
    setDeleteTarget(a);
    setDeleteConfirmOpen(true);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
    startTransition(async () => {
      const res = await deleteAnnouncement(id);
      if (res.success) toast.success("Anuncio eliminado.");
      else toast.error(res.message ?? "Error al eliminar.");
    });
  }

  function openDetail(a: AnnouncementRow) {
    setDetailAnn(a);
    setDetailOpen(true);
  }

  function openEdit(a: AnnouncementRow) {
    setEditingAnn(a);
    setFormOpen(true);
  }

  function openCreate() {
    setEditingAnn(null);
    setFormOpen(true);
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">Gestión de anuncios</h2>
          <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
            Comunica novedades a los usuarios de la plataforma.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nuevo anuncio
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-neutral-400)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar anuncios..."
            className="pl-8 w-56"
          />
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 p-1 bg-[var(--color-neutral-100)] rounded-lg">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-white text-[var(--color-neutral-900)] shadow-sm"
                  : "text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-700)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tipo */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as AnnouncementType | "todos")}
          className="h-9 rounded-md border border-[var(--color-neutral-200)] bg-white px-3 text-sm text-[var(--color-neutral-700)] outline-none focus:border-primary"
        >
          <option value="todos">Todos los tipos</option>
          <option value="informativo">Informativo</option>
          <option value="urgente">Urgente</option>
          <option value="recordatorio">Recordatorio</option>
        </select>

        {/* Limpiar */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("todos"); setTypeFilter("todos"); }}
            className="flex items-center gap-1 text-xs text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] transition-colors"
          >
            <X className="size-3.5" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-[var(--color-neutral-200)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Bell className="size-8 text-[var(--color-neutral-300)]" />
            <p className="text-sm font-medium text-[var(--color-neutral-600)]">
              {hasFilters ? "No hay anuncios con esos filtros" : "Aún no hay anuncios"}
            </p>
            {!hasFilters && (
              <p className="text-xs text-[var(--color-neutral-400)]">
                Crea el primer anuncio para comunicarte con los usuarios.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-neutral-100)] bg-[var(--color-neutral-50)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">Título</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">Destinatarios</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">Leídos</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">Canales</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-neutral-100)]">
                {filtered.map((a) => {
                  const tc = typeConfig[a.type];
                  const sc = statusConfig[a.status];
                  const canEdit = a.status === "borrador" || a.status === "programado";

                  return (
                    <tr
                      key={a.id}
                      className="hover:bg-[var(--color-neutral-50)] transition-colors"
                    >
                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${tc.classes}`}>
                          {tc.icon} {tc.label}
                        </span>
                      </td>

                      {/* Título */}
                      <td className="px-4 py-3 max-w-xs">
                        <button
                          onClick={() => openDetail(a)}
                          className="text-left font-medium text-[var(--color-neutral-900)] hover:text-primary truncate block max-w-full transition-colors"
                          title={a.title}
                        >
                          {a.title}
                        </button>
                      </td>

                      {/* Destinatarios */}
                      <td className="px-4 py-3 text-[var(--color-neutral-600)] text-xs">
                        {targetLabel(a)}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sc.classes}`}>
                          {sc.label}
                        </span>
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3 text-xs text-[var(--color-neutral-500)]">
                        {a.sent_at
                          ? formatDate(a.sent_at)
                          : a.send_at
                          ? formatDate(a.send_at)
                          : formatDate(a.created_at)}
                      </td>

                      {/* Leídos */}
                      <td className="px-4 py-3 text-center">
                        <span className="flex items-center justify-center gap-1 text-xs text-[var(--color-neutral-600)]">
                          <Eye className="size-3.5" />
                          {a.read_count}
                        </span>
                      </td>

                      {/* Canales */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {a.channel_platform && <Monitor className="size-3.5 text-[var(--color-neutral-500)]" title="Plataforma" />}
                          {a.channel_email    && <Mail    className="size-3.5 text-[var(--color-neutral-500)]" title="Email" />}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)] transition-colors">
                              <MoreHorizontal className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => openDetail(a)}>
                              <Eye className="size-4" /> Ver detalles
                            </DropdownMenuItem>

                            {canEdit && (
                              <DropdownMenuItem onClick={() => openEdit(a)}>
                                <Pencil className="size-4" /> Editar
                              </DropdownMenuItem>
                            )}

                            {a.status === "borrador" && (
                              <DropdownMenuItem onClick={() => handleSend(a)}>
                                <Send className="size-4" /> Enviar ahora
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={() => handleDuplicate(a)}>
                              <Copy className="size-4" /> Duplicar
                            </DropdownMenuItem>

                            {a.status !== "archivado" && (
                              <DropdownMenuItem onClick={() => handleArchive(a)}>
                                <Archive className="size-4" /> Archivar
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleDelete(a)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="size-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Conteo */}
      {filtered.length > 0 && (
        <p className="text-xs text-[var(--color-neutral-400)]">
          Mostrando {filtered.length} de {announcements.length} anuncios
        </p>
      )}

      {/* Dialogs */}
      <AnnouncementFormDialog
        key={`form-${editingAnn?.id ?? formOpen}`}
        announcement={editingAnn ?? undefined}
        courses={courses}
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingAnn(null); }}
      />

      <AnnouncementDetailDialog
        announcement={detailAnn}
        open={detailOpen}
        onOpenChange={(v) => { setDetailOpen(v); if (!v) setDetailAnn(null); }}
      />

      {/* Confirmación eliminar */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar anuncio</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-neutral-600)]">
            ¿Eliminar <span className="font-medium text-[var(--color-neutral-900)]">&ldquo;{deleteTarget?.title}&rdquo;</span>? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

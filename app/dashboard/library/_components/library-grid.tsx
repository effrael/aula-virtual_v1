"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Upload, Trash2, Copy, Files, Pencil,
  ImageIcon, FileText, FileSpreadsheet, Archive, File,
  Video, Loader2, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  uploadFile,
  deleteStorageFile,
  listStorageFiles,
  listVideos,
  renameStorageFile,
  renameVideo,
} from "@/app/actions/storage";
import {
  getFileCategory,
  type StorageFile,
  type FileCategory,
} from "@/lib/storage-utils";
import { formatBytes } from "@/lib/utils";
import type { VideoRow } from "@/lib/storage-utils";
import { formatDuration } from "@/lib/utils";

// ── Icono por categoría ────────────────────────────────────────────────────

const categoryMeta: Record<FileCategory, { icon: React.ElementType; color: string }> = {
  image:  { icon: ImageIcon,        color: "text-violet-500" },
  pdf:    { icon: FileText,         color: "text-red-500"    },
  word:   { icon: FileText,         color: "text-blue-500"   },
  excel:  { icon: FileSpreadsheet,  color: "text-green-600"  },
  zip:    { icon: Archive,          color: "text-amber-500"  },
  other:  { icon: File,             color: "text-neutral-400"},
};

const statusIcon = {
  procesando: <Loader2 className="size-3.5 animate-spin text-amber-500" />,
  listo:      <CheckCircle2 className="size-3.5 text-green-500" />,
  error:      <XCircle className="size-3.5 text-red-500" />,
};

const statusLabel = {
  procesando: "Procesando",
  listo:      "Listo",
  error:      "Error",
};

// ── Tabs ───────────────────────────────────────────────────────────────────

type Tab = "all" | FileCategory | "video";

const BASE_TABS: { key: Tab; label: string }[] = [
  { key: "all",   label: "Todos"    },
  { key: "image", label: "Imágenes" },
  { key: "pdf",   label: "PDF"      },
  { key: "word",  label: "Word"     },
  { key: "excel", label: "Excel"    },
  { key: "zip",   label: "ZIP"      },
  { key: "other", label: "Otros"    },
  { key: "video", label: "Videos"   },
];

const ACCEPT_ALL =
  "image/jpeg,image/png,image/webp,application/pdf,application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "application/zip,application/x-zip-compressed";

const ACCEPT_VIDEO = "video/mp4,video/quicktime,video/x-msvideo,video/webm";

// ── Component ──────────────────────────────────────────────────────────────

type Props = {
  bucket: string;
  initialFiles: StorageFile[];
  initialVideos: VideoRow[];
};

export function LibraryGrid({ bucket, initialFiles, initialVideos }: Props) {
  const [files, setFiles] = useState<StorageFile[]>(initialFiles);
  const [videos, setVideos] = useState<VideoRow[]>(initialVideos);
  const [tab, setTab] = useState<Tab>("all");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  // Dialog compartido para doc y video: guarda el archivo pendiente y su nombre
  const [pendingUpload, setPendingUpload] = useState<{ file: File; type: "doc" | "video" } | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [docPending, startDoc] = useTransition();
  const [editingItem, setEditingItem] = useState<
    { type: "doc"; path: string; current: string } | { type: "video"; id: string; current: string } | null
  >(null);
  const [editName, setEditName] = useState("");
  const [renamePending, startRename] = useTransition();

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── Bloquear recarga mientras se está subiendo un video ───────────────
  useEffect(() => {
    if (!uploadingVideo) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [uploadingVideo]);

  // ── Polling: refresca videos mientras alguno esté procesando ──────────
  useEffect(() => {
    const hasProcessing = videos.some((v) => v.status === "procesando");
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      const fresh = await listVideos();
      setVideos(fresh);

      const stillProcessing = fresh.some((v) => v.status === "procesando");
      if (!stillProcessing) {
        clearInterval(interval);
        toast.success("Video procesado y listo.");
      }
    }, 5000); // cada 5 segundos

    return () => clearInterval(interval);
  }, [videos]);

  // ── Helpers ────────────────────────────────────────────────────────────

  async function refreshFiles() {
    const fresh = await listStorageFiles(bucket);
    setFiles(fresh);
  }

  function openUploadDialog(file: File, type: "doc" | "video") {
    setPendingUpload({ file, type });
    setUploadName(file.name.replace(/\.[^/.]+$/, ""));
  }

  // ── Upload archivos (Storage) ──────────────────────────────────────────

  function handleDocFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    openUploadDialog(file, "doc");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDocUploadConfirm(file: File, name: string) {
    startDoc(async () => {
      const form = new FormData();
      form.append("file", file);
      form.append("name", name);
      const result = await uploadFile(bucket, undefined, form);
      if (result?.success) {
        toast.success("Archivo subido correctamente.");
        refreshFiles();
      } else {
        toast.error(result?.message ?? "Error al subir el archivo.");
      }
    });
  }

  // ── Upload video (API Route + FFmpeg) ──────────────────────────────────

  function handleVideoFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    openUploadDialog(file, "video");
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  async function handleVideoUploadConfirm(file: File, title: string) {
    setUploadingVideo(true);
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    try {
      const res = await fetch("/api/upload/video", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? "Error al subir el video.");
      } else {
        toast.success("Video subido. Procesando con FFmpeg...");
        setVideos((prev) => [
          {
            id: json.videoId,
            title,
            status: "procesando",
            duration: null,
            hls_url: null,
            file_size: file.size,
            file_size_label: formatBytes(file.size),
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        setTab("video");
      }
    } catch {
      toast.error("Error de conexión al subir el video.");
    } finally {
      setUploadingVideo(false);
    }
  }

  function handleUploadConfirm() {
    if (!pendingUpload || !uploadName.trim()) return;
    const { file, type } = pendingUpload;
    const name = uploadName.trim();
    setPendingUpload(null);
    if (type === "doc") {
      handleDocUploadConfirm(file, name);
    } else {
      handleVideoUploadConfirm(file, name);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  async function handleDeleteFile(fileName: string) {
    const res = await deleteStorageFile(bucket, fileName);
    if (res.success) {
      toast.success("Archivo eliminado.");
      refreshFiles();
    } else {
      toast.error(res.message);
    }
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada.");
  }

  function openRenameDialog(item: typeof editingItem) {
    if (!item) return;
    setEditingItem(item);
    setEditName(item.current.replace(/\.[^/.]+$/, "").replace(/_\d{10,}$/, ""));
  }

  function handleRenameConfirm() {
    if (!editingItem || !editName.trim()) return;
    const name = editName.trim();
    startRename(async () => {
      const result =
        editingItem.type === "doc"
          ? await renameStorageFile(bucket, editingItem.path, name)
          : await renameVideo(editingItem.id, name);

      if (result.success) {
        toast.success("Nombre actualizado.");
        if (editingItem.type === "doc") {
          refreshFiles();
        } else {
          setVideos((prev) =>
            prev.map((v) => (v.id === editingItem.id ? { ...v, title: name } : v))
          );
        }
        setEditingItem(null);
      } else {
        toast.error(result.message ?? "Error al renombrar.");
      }
    });
  }

  // ── Tabs visibles ──────────────────────────────────────────────────────

  const tabsWithCount = BASE_TABS.map((t) => ({
    ...t,
    count:
      t.key === "all"    ? files.length + videos.length
      : t.key === "video"  ? videos.length
      : files.filter((f) => getFileCategory(f.mimetype) === t.key).length,
  })).filter((t) => t.key === "all" || t.count > 0);

  const visibleFiles   = tab === "all" ? files : tab === "video" ? [] : files.filter((f) => getFileCategory(f.mimetype) === tab);
  const visibleVideos  = tab === "all" || tab === "video" ? videos : [];
  const isVideoTab     = tab === "video";

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
    <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-neutral-100)]">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabsWithCount.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)]"
              }`}
            >
              {t.label}
              <span className="ml-1.5 opacity-70">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          {!isVideoTab && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ALL}
                className="hidden"
                onChange={handleDocFileSelected}
              />
              <Button
                type="button"
                size="sm"
                disabled={docPending}
                className="text-white"
                onClick={() => fileInputRef.current?.click()}
              >
                {docPending ? (
                  <><Loader2 className="size-4 mr-1.5 animate-spin" />Subiendo...</>
                ) : (
                  <><Upload className="size-4 mr-1.5" />Subir archivo</>
                )}
              </Button>
            </>
          )}

          {(isVideoTab || tab === "all") && (
            <>
              <input
                ref={videoInputRef}
                type="file"
                accept={ACCEPT_VIDEO}
                className="hidden"
                onChange={handleVideoFileSelected}
              />
              <Button
                type="button"
                size="sm"
                variant={isVideoTab ? "default" : "outline"}
                disabled={uploadingVideo}
                className={isVideoTab ? "text-white" : ""}
                onClick={() => videoInputRef.current?.click()}
              >
                {uploadingVideo ? (
                  <><Loader2 className="size-4 mr-1.5 animate-spin" />Subiendo...</>
                ) : (
                  <><Video className="size-4 mr-1.5" />Subir video</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Grid */}
      {visibleFiles.length === 0 && visibleVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="flex items-center justify-center size-14 rounded-full bg-[var(--color-neutral-100)]">
            <Files className="size-7 text-[var(--color-neutral-400)]" />
          </span>
          <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
            No hay archivos todavía
          </p>
          <p className="text-xs text-[var(--color-neutral-500)]">
            Sube el primer archivo para empezar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 p-5">
          {/* Archivos de Storage */}
          {visibleFiles.map((file) => {
            const category = getFileCategory(file.mimetype);
            const meta = categoryMeta[category];
            const Icon = meta.icon;
            const isImage = category === "image";

            return (
              <div
                key={file.name}
                className="group relative rounded-lg overflow-hidden border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]"
              >
                {isImage ? (
                  <img src={file.publicUrl} alt={file.name} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 flex flex-col items-center justify-center gap-2">
                    <Icon className={`size-10 ${meta.color}`} />
                    <span className="text-xs font-semibold text-[var(--color-neutral-500)] uppercase">
                      {file.name.split(".").pop()}
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button type="button" onClick={() => handleCopy(file.publicUrl)}
                    className="size-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
                    <Copy className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => openRenameDialog({ type: "doc", path: file.name, current: file.name })}
                    className="size-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
                    <Pencil className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDeleteFile(file.name)}
                    className="size-8 rounded-full bg-white/20 hover:bg-red-500 flex items-center justify-center text-white transition-colors">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div className="px-2 py-1.5 border-t border-[var(--color-neutral-100)]">
                  <p className="text-xs text-[var(--color-neutral-700)] truncate font-medium">{file.name}</p>
                  <p className="text-xs text-[var(--color-neutral-400)]">{formatBytes(file.size)}</p>
                </div>
              </div>
            );
          })}

          {/* Videos */}
          {visibleVideos.map((video) => (
            <div
              key={video.id}
              className="group relative rounded-lg overflow-hidden border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]"
            >
              <div className="w-full h-32 bg-neutral-900 flex flex-col items-center justify-center gap-2">
                <Video className="size-10 text-neutral-500" />
                {video.duration && (
                  <span className="text-xs text-neutral-400">{formatDuration(video.duration)}</span>
                )}
              </div>

              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-0.5">
                {statusIcon[video.status]}
                <span className="text-xs text-white">{statusLabel[video.status]}</span>
              </div>

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {video.status === "listo" && video.hls_url && (
                  <button type="button" onClick={() => handleCopy(video.hls_url!)}
                    className="size-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
                    <Copy className="size-3.5" />
                  </button>
                )}
                <button type="button" onClick={() => openRenameDialog({ type: "video", id: video.id, current: video.title })}
                  className="size-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
                  <Pencil className="size-3.5" />
                </button>
              </div>

              <div className="px-2 py-1.5 border-t border-[var(--color-neutral-100)]">
                <p className="text-xs text-[var(--color-neutral-700)] truncate font-medium">{video.title}</p>
                <p className="text-xs text-[var(--color-neutral-400)]">{video.file_size_label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

      {/* Dialog de nombre — compartido para archivos y videos */}
      <Dialog open={!!pendingUpload} onOpenChange={(open) => { if (!open) setPendingUpload(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pendingUpload?.type === "video" ? "Nombre del video" : "Nombre del archivo"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <label className="text-sm font-medium text-[var(--color-neutral-700)]">
              Nombre <span className="text-red-500">*</span>
            </label>
            <Input
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="Ej. Introducción al módulo 1"
              onKeyDown={(e) => { if (e.key === "Enter") handleUploadConfirm(); }}
              autoFocus
            />
            {pendingUpload && (
              <p className="text-xs text-[var(--color-neutral-400)]">
                {pendingUpload.file.name} · {formatBytes(pendingUpload.file.size)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingUpload(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUploadConfirm}
              disabled={!uploadName.trim()}
              className="text-white"
            >
              {pendingUpload?.type === "video" ? "Subir video" : "Subir archivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog de editar nombre */}
      <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar nombre</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <label className="text-sm font-medium text-[var(--color-neutral-700)]">
              Nombre <span className="text-red-500">*</span>
            </label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRenameConfirm(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRenameConfirm}
              disabled={renamePending || !editName.trim()}
              className="text-white"
            >
              {renamePending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Info, Bell, X, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import {
  getUnreadAnnouncementsForUser,
  markAnnouncementRead,
  type UnreadAnnouncement,
} from "@/app/actions/announcements";

// ── Helpers ───────────────────────────────────────────────────────────────────

const contentClasses =
  "text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0.5 [&_a]:text-blue-600 [&_a]:underline [&_b]:font-semibold [&_strong]:font-semibold [&_i]:italic [&_em]:italic";

function BannerImage({ url, link }: { url: string; link: string | null }) {
  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="block">
        <img src={url} alt="" className="w-full object-cover max-h-52 rounded-t-2xl" />
      </a>
    );
  }
  return <img src={url} alt="" className="w-full object-cover max-h-52 rounded-t-2xl" />;
}

function CtaButton({ text, url, color }: { text: string; url: string; color: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${color}`}
    >
      {text}
      <ExternalLink className="size-3.5" />
    </a>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AnnouncementBanner() {
  const { profile } = useAuthStore();
  const [queue, setQueue]       = useState<UnreadAnnouncement[]>([]);
  const [current, setCurrent]   = useState<UnreadAnnouncement | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const loaded                  = useRef(false);

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!profile || loaded.current) return;
    loaded.current = true;

    getUnreadAnnouncementsForUser(profile.id, profile.role).then((data) => {
      // Prioridad: urgente → informativo → recordatorio
      const sorted = [...data].sort((a, b) => {
        const p: Record<string, number> = { urgente: 0, informativo: 1, recordatorio: 2 };
        return (p[a.type] ?? 3) - (p[b.type] ?? 3);
      });

      // Los recordatorios van como toasts de Sonner
      sorted
        .filter((a) => a.type === "recordatorio")
        .forEach((a) => {
          toast(a.title, {
            icon: <Bell className="size-4 text-amber-600" />,
            duration: 6000,
            ...(a.cta_text && a.cta_url
              ? { action: { label: a.cta_text, onClick: () => window.open(a.cta_url!, "_blank") } }
              : {}),
            onDismiss: () => markAnnouncementRead(a.id),
            onAutoClose: () => markAnnouncementRead(a.id),
          });
        });

      // Urgentes e informativos van en cola de modales/banners
      const modalQueue = sorted.filter((a) => a.type !== "recordatorio");
      setQueue(modalQueue);
    });
  }, [profile?.id]);

  // ── Dequeue: muestra uno a la vez ─────────────────────────────────────────

  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setCurrent(next);
    setDetailOpen(false);
  }, [queue, current]);

  // ── Dismiss ────────────────────────────────────────────────────────────────

  async function dismiss() {
    if (!current) return;
    await markAnnouncementRead(current.id);
    setCurrent(null);
    setDetailOpen(false);
  }

  if (!current) return null;

  // ── URGENTE → Modal bloqueante ─────────────────────────────────────────────

  if (current.type === "urgente") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
          {current.banner_url && (
            <BannerImage url={current.banner_url} link={current.banner_link} />
          )}

          <div className="p-6 flex flex-col gap-4">
            <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <AlertTriangle className="size-3.5" /> Urgente
            </span>

            <h2 className="text-lg font-bold text-[var(--color-neutral-900)]">
              {current.title}
            </h2>

            <div
              className={`text-[var(--color-neutral-700)] ${contentClasses}`}
              dangerouslySetInnerHTML={{ __html: current.content }}
            />

            {current.cta_text && current.cta_url && (
              <CtaButton
                text={current.cta_text}
                url={current.cta_url}
                color="bg-red-600 text-white hover:bg-red-700"
              />
            )}

            <button
              onClick={dismiss}
              className="w-full py-2.5 px-4 rounded-lg border border-[var(--color-neutral-200)] text-sm font-medium text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)] transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── INFORMATIVO → Banner top + modal de detalle ───────────────────────────

  return (
    <>
      {/* Banner fijo */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 bg-blue-600 text-white shadow-md">
        <Info className="size-4 shrink-0" />
        <span className="flex-1 text-sm font-medium truncate">{current.title}</span>
        <button
          onClick={() => setDetailOpen(true)}
          className="shrink-0 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors"
        >
          Ver más
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Espacio reservado para que el layout no quede tapado */}
      <div className="h-12" />

      {/* Modal de detalle */}
      {detailOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDetailOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {current.banner_url && (
              <BannerImage url={current.banner_url} link={current.banner_link} />
            )}

            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                  <Info className="size-3.5" /> Informativo
                </span>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="p-1 rounded hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)] transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              <h2 className="text-lg font-bold text-[var(--color-neutral-900)]">
                {current.title}
              </h2>

              <div
                className={`text-[var(--color-neutral-700)] ${contentClasses}`}
                dangerouslySetInnerHTML={{ __html: current.content }}
              />

              {current.cta_text && current.cta_url && (
                <CtaButton
                  text={current.cta_text}
                  url={current.cta_url}
                  color="bg-blue-600 text-white hover:bg-blue-700"
                />
              )}

              <button
                onClick={dismiss}
                className="w-full py-2.5 border border-[var(--color-neutral-200)] rounded-lg text-sm font-medium hover:bg-[var(--color-neutral-50)] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

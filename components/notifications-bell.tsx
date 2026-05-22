"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Info, AlertTriangle, Check, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";
import {
  getUnreadAnnouncementsForUser,
  markAnnouncementRead,
  markAllAnnouncementsRead,
  type UnreadAnnouncement,
} from "@/app/actions/announcements";
import type { AnnouncementType } from "@/lib/queries/announcements";

type UnreadItem = Pick<UnreadAnnouncement, "id" | "title" | "type" | "created_at">;

const typeIcon: Record<AnnouncementType, React.ReactNode> = {
  informativo:  <Info className="size-3.5 text-blue-600 shrink-0" />,
  urgente:      <AlertTriangle className="size-3.5 text-red-600 shrink-0" />,
  recordatorio: <Bell className="size-3.5 text-amber-600 shrink-0" />,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "ahora";
  if (mins  < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

export function NotificationsBell() {
  const { profile } = useAuthStore();
  const [unread, setUnread] = useState<UnreadItem[]>([]);
  const [open, setOpen]     = useState(false);
  const panelRef            = useRef<HTMLDivElement>(null);

  async function fetchUnread() {
    if (!profile) return;
    const data = await getUnreadAnnouncementsForUser(profile.id, profile.role);
    setUnread(data);
  }

  // Cargar al montar y suscribir a cambios en tiempo real
  useEffect(() => {
    if (!profile) return;

    fetchUnread();

    const supabase = createClient();
    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => fetchUnread()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleMarkRead(id: string) {
    setUnread((prev) => prev.filter((a) => a.id !== id));
    await markAnnouncementRead(id);
  }

  async function handleMarkAll() {
    const ids = unread.map((a) => a.id);
    setUnread([]);
    await markAllAnnouncementsRead(ids);
  }

  if (!profile) return null;

  const count = unread.length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Botón campana */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center size-8 rounded-full hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="size-4.5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Panel desplegable */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-[var(--color-neutral-200)] bg-white shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-neutral-100)]">
            <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Notificaciones
              {count > 0 && (
                <span className="ml-2 text-xs font-normal text-[var(--color-neutral-500)]">
                  {count} sin leer
                </span>
              )}
            </p>
            {count > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck className="size-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto">
            {unread.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-4">
                <Bell className="size-8 text-[var(--color-neutral-300)]" />
                <p className="text-sm text-[var(--color-neutral-500)]">Todo al día</p>
                <p className="text-xs text-[var(--color-neutral-400)]">No tienes notificaciones sin leer.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-neutral-100)]">
                {unread.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-neutral-50)] transition-colors group"
                  >
                    <div className="mt-0.5">{typeIcon[item.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--color-neutral-900)] line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                      <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">
                        {timeAgo(item.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleMarkRead(item.id)}
                      title="Marcar como leído"
                      className="mt-0.5 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--color-neutral-200)] text-[var(--color-neutral-500)] transition-all"
                    >
                      <Check className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[var(--color-neutral-100)] bg-[var(--color-neutral-50)]">
            <a
              href="/dashboard/ads"
              className="text-xs text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              Ver todos los anuncios →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

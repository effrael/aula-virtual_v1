"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Trash2, ExternalLink, ChevronLeft, ChevronRight, Loader2, Send, Download, Search, X } from "lucide-react";
import Link from "next/link";
import { deleteCertificate, getIssuedCertificates, getAllIssuedCertificatesForExport, resendCertificateEmail } from "@/app/actions/certificates";
import type { IssuedCertificate } from "@/app/actions/certificates";

const PAGE_SIZE = 5;

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

type Props = {
  initialData: IssuedCertificate[];
  total: number;
};

export function IssuedCertificatesTable({ initialData, total }: Props) {
  const [certificates, setCertificates] = useState<IssuedCertificate[]>(initialData);
  const [totalCount, setTotalCount]     = useState(total);
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState("");
  const [searchInput, setSearchInput]   = useState("");
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [resendingId, setResendingId]   = useState<string | null>(null);
  const [exporting, setExporting]       = useState(false);
  const [isPending, startTransition]    = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function fetchPage(p: number, q = search) {
    startTransition(async () => {
      const res = await getIssuedCertificates(p, q);
      setCertificates(res.data);
      setTotalCount(res.total);
      setPage(p);
    });
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      fetchPage(1, value);
    }, 400);
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    fetchPage(1, "");
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este certificado? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    const res = await deleteCertificate(id);
    setDeletingId(null);
    if (res.success) {
      toast.success("Certificado eliminado.");
      const newTotal = totalCount - 1;
      const newTotalPages = Math.ceil(newTotal / PAGE_SIZE);
      fetchPage(Math.min(page, Math.max(1, newTotalPages)), search);
    } else {
      toast.error(res.message ?? "Error al eliminar.");
    }
  }

  async function handleResend(id: string, email: string | null) {
    if (!email) { toast.error("Este alumno no tiene correo registrado."); return; }
    setResendingId(id);
    const res = await resendCertificateEmail(id);
    setResendingId(null);
    if (res.success) toast.success("Certificado reenviado.");
    else toast.error(res.message ?? "Error al reenviar.");
  }

  async function handleExport() {
    setExporting(true);
    const data = await getAllIssuedCertificatesForExport();
    setExporting(false);

    if (data.length === 0) { toast.error("No hay certificados para exportar."); return; }

    const XLSX = await import("xlsx");
    const rows = data.map((c) => ({
      Alumno:    c.student_name,
      Email:     c.student_email ?? "",
      Curso:     c.course_title,
      Plantilla: c.template_name ?? "",
      Código:    c.certificate_code ?? "",
      Fecha:     new Date(c.issued_at).toLocaleDateString("es-PE", { year: "numeric", month: "short", day: "numeric" }),
      Hora:      new Date(c.issued_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
      Nota:      c.score ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0]).map((k) => ({ wch: Math.max(k.length + 4, 16) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Certificados");
    XLSX.writeFile(wb, `certificados-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-neutral-100)]">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-neutral-400)]" />
          <input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por alumno o código..."
            className="w-full pl-8 pr-8 h-8 text-xs rounded-md border border-[var(--color-neutral-200)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-400)]"
          />
          {searchInput && (
            <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)]">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-[var(--color-neutral-200)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)] disabled:opacity-50 transition-colors ml-auto"
        >
          {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          Exportar Excel
        </button>
      </div>

      {/* Table */}
      <div className="relative">
        {isPending && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
            <Loader2 className="size-5 text-[var(--color-primary)] animate-spin" />
          </div>
        )}

        {certificates.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--color-neutral-400)]">
            {search ? "Sin resultados para esa búsqueda." : "No hay certificados emitidos aún."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-neutral-100)]">
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)]">Alumno</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)] hidden lg:table-cell">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)]">Curso</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)] hidden md:table-cell">Plantilla</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)] hidden sm:table-cell">Código</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)] hidden sm:table-cell">Fecha y hora</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-neutral-100)]">
              {certificates.map((cert) => (
                <tr key={cert.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center text-xs font-semibold text-[var(--color-primary)] shrink-0">
                        {initials(cert.student_name)}
                      </div>
                      <span className="text-sm text-[var(--color-neutral-900)] font-medium">
                        {cert.student_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--color-neutral-500)] hidden lg:table-cell">
                    {cert.student_email ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-sm text-[var(--color-neutral-700)]">{cert.course_title}</td>
                  <td className="px-5 py-3 text-xs text-[var(--color-neutral-500)] hidden md:table-cell">
                    {cert.template_name ?? "—"}
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    {cert.certificate_code ? (
                      <span className="font-mono text-xs font-semibold text-[var(--color-neutral-900)]">
                        {cert.certificate_code}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-neutral-400)]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <div className="flex flex-col">
                      <span className="text-xs text-[var(--color-neutral-700)]">
                        {new Date(cert.issued_at).toLocaleDateString("es-PE", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </span>
                      <span className="text-[11px] text-[var(--color-neutral-400)]" suppressHydrationWarning>
                        {new Date(cert.issued_at).toLocaleTimeString("es-PE", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/verify/${cert.certificate_code}`}
                        target="_blank"
                        className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="size-3" />
                        Ver
                      </Link>
                      <button
                        onClick={() => handleResend(cert.id, cert.student_email)}
                        disabled={resendingId === cert.id}
                        className="text-xs text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-800)] disabled:opacity-40 transition-colors"
                        title="Reenviar certificado por email"
                      >
                        {resendingId === cert.id
                          ? <Loader2 className="size-3.5 animate-spin" />
                          : <Send className="size-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(cert.id)}
                        disabled={deletingId === cert.id}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                        title="Eliminar certificado"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-neutral-100)]">
          <p className="text-xs text-[var(--color-neutral-400)]">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} de {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchPage(page - 1)}
              disabled={page === 1 || isPending}
              className="size-7 flex items-center justify-center rounded-md border border-[var(--color-neutral-200)] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => fetchPage(p)}
                disabled={isPending}
                className={`size-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                  p === page
                    ? "bg-[var(--color-primary)] text-white"
                    : "border border-[var(--color-neutral-200)] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-50)]"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => fetchPage(page + 1)}
              disabled={page === totalPages || isPending}
              className="size-7 flex items-center justify-center rounded-md border border-[var(--color-neutral-200)] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

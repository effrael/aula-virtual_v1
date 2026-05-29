"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { deleteCertificate } from "@/app/actions/certificates";
import type { IssuedCertificate } from "@/app/actions/certificates";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function IssuedCertificatesTable({ certificates }: { certificates: IssuedCertificate[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este certificado? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    const res = await deleteCertificate(id);
    setDeletingId(null);
    if (res.success) {
      toast.success("Certificado eliminado.");
      router.refresh();
    } else {
      toast.error(res.message ?? "Error al eliminar.");
    }
  }

  if (certificates.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-sm text-[var(--color-neutral-400)]">
        No hay certificados emitidos aún.
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--color-neutral-100)]">
          <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)]">Alumno</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)]">Curso</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)] hidden md:table-cell">Plantilla</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)] hidden sm:table-cell">Código</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)] hidden sm:table-cell">Fecha</th>
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
            <td className="px-5 py-3 text-xs text-[var(--color-neutral-400)] hidden sm:table-cell">
              {new Date(cert.issued_at).toLocaleDateString("es-PE", {
                year: "numeric", month: "short", day: "numeric",
              })}
            </td>
            <td className="px-5 py-3">
              <div className="flex items-center justify-end gap-3">
                <Link
                  href={`/verify/${cert.verification_code}`}
                  target="_blanck"
                  className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="size-3" />
                  Ver
                </Link>
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
  );
}

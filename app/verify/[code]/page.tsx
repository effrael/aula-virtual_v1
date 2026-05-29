import { getCertificateByCode } from "@/app/actions/certificates";
import { getSettings } from "@/lib/queries/settings";
import { Award, XCircle, Download, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cert = await getCertificateByCode(code);
  const settings = await getSettings();

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.name}
              className="h-12 object-contain"
            />
          ) : (
            <p className="text-lg font-bold text-[var(--color-neutral-900)]">
              {settings.name}
            </p>
          )}
        </div>

        {!cert ? (
          /* Invalid certificate */
          <div className="rounded-xl border border-red-200 bg-white p-8 text-center flex flex-col items-center gap-4">
            <XCircle className="size-16 text-red-500" />
            <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">
              Certificado no válido
            </h1>
            <p className="text-sm text-[var(--color-neutral-500)]">
              El código de verificación no corresponde a ningún certificado emitido.
            </p>
          </div>
        ) : (
          /* Valid certificate */
          <div className="rounded-xl border border-green-200 bg-white p-8 flex flex-col items-center gap-5">
            <div className="flex items-center gap-2 text-green-600">
              <ShieldCheck className="size-8" />
              <span className="text-lg font-bold">Certificado válido</span>
            </div>

            <div className="w-full space-y-3 text-sm">
              <div className="flex justify-between border-b border-[var(--color-neutral-100)] pb-2">
                <span className="text-[var(--color-neutral-500)]">Alumno</span>
                <span className="font-medium text-[var(--color-neutral-900)]">{cert.student_name}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--color-neutral-100)] pb-2">
                <span className="text-[var(--color-neutral-500)]">Curso</span>
                <span className="font-medium text-[var(--color-neutral-900)]">{cert.course_title}</span>
              </div>
              {cert.score !== null && (
                <div className="flex justify-between border-b border-[var(--color-neutral-100)] pb-2">
                  <span className="text-[var(--color-neutral-500)]">Nota</span>
                  <span className="font-medium text-[var(--color-neutral-900)]">{cert.score}%</span>
                </div>
              )}
              <div className="flex justify-between border-b border-[var(--color-neutral-100)] pb-2">
                <span className="text-[var(--color-neutral-500)]">Fecha de emisión</span>
                <span className="font-medium text-[var(--color-neutral-900)]">
                  {new Date(cert.issued_at).toLocaleDateString("es-PE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              {cert.certificate_code && (
                <div className="flex justify-between pb-2">
                  <span className="text-[var(--color-neutral-500)]">Código</span>
                  <span className="font-mono text-sm font-semibold text-[var(--color-neutral-900)]">{cert.certificate_code}</span>
                </div>
              )}
            </div>

            {cert.pdf_url && (
              <a
                href={cert.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                <Download className="size-4" />
                Descargar PDF
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

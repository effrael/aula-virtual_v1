import { PageHeader } from "@/components/page-header";
import {
  Award,
  BookOpen,
  ScrollText,
  Download,
  FileText,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getCertificateTemplates } from "@/app/actions/certificate-templates";
import { getIssuedCertificates, getCertificatesStats, getCertificatesByStudent } from "@/app/actions/certificates";
import { CreateTemplateDialog } from "./_components/create-template-dialog";
import { IssueCertificateDialog } from "./_components/issue-certificate-dialog";
import { TemplateCard } from "./_components/template-card";
import { getStudents } from "@/lib/queries/enrollments";
import { getCourses } from "@/lib/queries/courses";
import Link from "next/link";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function CertificatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "alumno";

  // ── Vista del alumno ──────────────────────────────────────────────────────
  if (role === "alumno") {
    const certificates = await getCertificatesByStudent(user.id);

    return (
      <>
        <PageHeader>
          <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
            Mis Certificados
          </h1>
        </PageHeader>

        <main className="flex flex-col gap-6 p-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">
              Mis Certificados
            </h2>
            <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
              Certificados obtenidos al aprobar evaluaciones de certificación.
            </p>
          </div>

          {certificates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--color-neutral-400)]">
              <Award className="size-12" />
              <p className="text-sm">Aún no tienes certificados.</p>
              <p className="text-xs">Completa las evaluaciones de certificación para obtenerlos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-5 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center size-10 rounded-lg bg-green-50 text-green-600 shrink-0">
                      <Award className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-neutral-900)] truncate">
                        {cert.course_title}
                      </p>
                      <p className="text-xs text-[var(--color-neutral-400)]">
                        {new Date(cert.issued_at).toLocaleDateString("es-PE", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {cert.score !== null && (
                    <p className="text-xs text-[var(--color-neutral-500)]">
                      Nota: <span className="font-semibold">{cert.score}%</span>
                    </p>
                  )}

                  <div className="flex gap-2 mt-auto pt-2 border-t border-[var(--color-neutral-100)]">
                    {cert.pdf_url && (
                      <a
                        href={cert.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline"
                      >
                        <Download className="size-3.5" />
                        Descargar PDF
                      </a>
                    )}
                    <Link
                      href={`/verify/${cert.verification_code}`}
                      className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline ml-auto"
                    >
                      <ExternalLink className="size-3.5" />
                      Ver certificado
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </>
    );
  }

  // ── Vista admin/docente/colaborador ────────────────────────────────────────
  const [templates, issuedCertificates, stats, students, allCourses] = await Promise.all([
    getCertificateTemplates(),
    getIssuedCertificates(),
    getCertificatesStats(),
    getStudents(),
    getCourses(),
  ]);

  const coursesForDialog = allCourses
    .filter((c) => c.status === "publicado")
    .map((c) => ({ id: c.id, title: c.title }));

  const templatesForDialog = templates.map((t) => {
    // Extraer nombres de campos del schema de pdfme
    const fieldNames: string[] = [];
    const tpl = t.pdfme_template as any;
    if (tpl?.schemas) {
      for (const page of tpl.schemas) {
        if (Array.isArray(page)) {
          for (const field of page) {
            if (field?.name) fieldNames.push(field.name);
          }
        }
      }
    }
    return {
      id: t.id,
      name: t.name,
      hasDesign: tpl != null && Object.keys(tpl).length > 0,
      fieldNames,
    };
  });

  const kpis = [
    {
      label: "Plantillas creadas",
      value: String(templates.length),
      icon: ScrollText,
      color: "bg-violet-50 text-violet-600",
    },
    {
      label: "Certificados emitidos",
      value: String(stats.total),
      icon: Award,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Cursos con certificados",
      value: String(stats.byCourse.length),
      icon: BookOpen,
      color: "bg-blue-50 text-blue-600",
    },
  ];

  return (
    <>
      <PageHeader>
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Certificados
        </h1>
      </PageHeader>

      <main className="flex flex-col gap-6 p-6">
        {/* Title + action */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">
              Certificados
            </h2>
            <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
              Gestiona las plantillas y visualiza los certificados emitidos.
            </p>
          </div>
          <div className="flex gap-2">
            <IssueCertificateDialog students={students} courses={coursesForDialog} templates={templatesForDialog} />
            <CreateTemplateDialog />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-5 flex items-center gap-4"
            >
              <span
                className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${kpi.color}`}
              >
                <kpi.icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-bold text-[var(--color-neutral-900)]">
                  {kpi.value}
                </p>
                <p className="text-xs text-[var(--color-neutral-500)]">
                  {kpi.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Templates */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-neutral-900)] mb-3">
            Plantillas de certificado
          </h3>
          {templates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-neutral-300)] bg-white p-8 flex flex-col items-center justify-center gap-2 text-[var(--color-neutral-400)]">
              <FileText className="size-8" />
              <p className="text-sm">No hay plantillas creadas.</p>
              <p className="text-xs">Crea una plantilla para empezar a emitir certificados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {templates.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  id={tpl.id}
                  name={tpl.name}
                  description={tpl.description}
                />
              ))}
            </div>
          )}
        </div>

        {/* Issued certificates table */}
        <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white">
          <div className="px-5 py-4 border-b border-[var(--color-neutral-100)]">
            <h3 className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Certificados emitidos
            </h3>
          </div>
          {issuedCertificates.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[var(--color-neutral-400)]">
              No hay certificados emitidos aún.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-neutral-100)]">
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)]">
                    Alumno
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)]">
                    Curso
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)] hidden md:table-cell">
                    Plantilla
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)] hidden sm:table-cell">
                    Fecha
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-neutral-100)]">
                {issuedCertificates.map((cert) => (
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
                    <td className="px-5 py-3 text-sm text-[var(--color-neutral-700)]">
                      {cert.course_title}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--color-neutral-500)] hidden md:table-cell">
                      {cert.template_name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--color-neutral-400)] hidden sm:table-cell">
                      {new Date(cert.issued_at).toLocaleDateString("es-PE", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/verify/${cert.verification_code}`}
                        className="text-xs text-[var(--color-primary)] hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}

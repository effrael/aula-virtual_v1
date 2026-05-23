import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Award,
  MoreHorizontal,
  BookOpen,
  ScrollText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Datos estáticos (temporales hasta conectar BD) ──────────────────────────

const kpis = [
  {
    label: "Plantillas creadas",
    value: "4",
    icon: ScrollText,
    color: "bg-violet-50 text-violet-600",
  },
  {
    label: "Certificados emitidos",
    value: "127",
    icon: Award,
    color: "bg-green-50 text-green-600",
  },
  {
    label: "Cursos con plantilla",
    value: "18",
    icon: BookOpen,
    color: "bg-blue-50 text-blue-600",
  },
];

const templates = [
  {
    id: "1",
    name: "Plantilla estándar",
    description: "Diseño institucional con logo y firma del director.",
    courses_using: 12,
    issued: 94,
  },
  {
    id: "2",
    name: "Plantilla de honor",
    description: "Para alumnos destacados con mención especial.",
    courses_using: 4,
    issued: 21,
  },
  {
    id: "3",
    name: "Plantilla técnica",
    description: "Para certificados de cursos técnicos y vocacionales.",
    courses_using: 2,
    issued: 12,
  },
  {
    id: "4",
    name: "Plantilla básica",
    description: "Versión simplificada sin elementos gráficos adicionales.",
    courses_using: 0,
    issued: 0,
  },
];

const issuedCertificates = [
  {
    student: "Luis Medina",
    course: "Matemáticas avanzadas",
    template: "Plantilla estándar",
    issued_at: "10 may 2026",
  },
  {
    student: "Carmen Ruiz",
    course: "Inglés intermedio B2",
    template: "Plantilla estándar",
    issued_at: "9 may 2026",
  },
  {
    student: "Rosa Pérez",
    course: "Historia del Perú",
    template: "Plantilla de honor",
    issued_at: "7 may 2026",
  },
  {
    student: "Marco Silva",
    course: "Química general",
    template: "Plantilla estándar",
    issued_at: "5 may 2026",
  },
  {
    student: "Ana Torres",
    course: "Filosofía moderna",
    template: "Plantilla técnica",
    issued_at: "2 may 2026",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function CertificatesPage() {
  return (
    <>
      <PageHeader>
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Certificados
        </h1>
      </PageHeader>

      <main className="flex flex-col gap-6 p-6">
        {/* Título + acción */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">
              Certificados
            </h2>
            <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
              Gestiona las plantillas y visualiza los certificados emitidos.
            </p>
          </div>
          <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shrink-0">
            <Plus className="size-4 mr-1.5" />
            Nueva plantilla
          </Button>
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

        {/* Plantillas */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-neutral-900)] mb-3">
            Plantillas de certificado
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-xl border border-[var(--color-neutral-200)] bg-white overflow-hidden flex flex-col"
              >
                {/* Preview placeholder */}
                <div className="h-32 bg-[var(--color-neutral-100)] flex items-center justify-center border-b border-[var(--color-neutral-200)]">
                  <Award className="size-10 text-[var(--color-neutral-300)]" />
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
                      {tpl.name}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="shrink-0 p-1 rounded-md hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-400)]">
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Duplicar</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-[var(--color-neutral-400)] line-clamp-2">
                    {tpl.description}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--color-neutral-100)] text-xs text-[var(--color-neutral-500)]">
                    <span>{tpl.courses_using} cursos</span>
                    <span>{tpl.issued} emitidos</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certificados emitidos */}
        <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white">
          <div className="px-5 py-4 border-b border-[var(--color-neutral-100)]">
            <h3 className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Certificados emitidos
            </h3>
          </div>
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
                <tr key={`${cert.student}-${cert.course}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center text-xs font-semibold text-[var(--color-primary)] shrink-0">
                        {initials(cert.student)}
                      </div>
                      <span className="text-sm text-[var(--color-neutral-900)] font-medium">
                        {cert.student}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-[var(--color-neutral-700)]">
                    {cert.course}
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--color-neutral-500)] hidden md:table-cell">
                    {cert.template}
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--color-neutral-400)] hidden sm:table-cell">
                    {cert.issued_at}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="text-xs text-[var(--color-primary)] hover:underline">
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

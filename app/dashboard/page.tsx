import { PageHeader } from "@/components/page-header";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  Users,
  GraduationCap,
  BookOpen,
  UserPlus,
  BookPlus,
  Building2,
  BarChart3,
  TrendingUp,
  ChartCandlestickIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// ── Datos estáticos (temporales hasta conectar BD) ─────────────────────────

const kpis = [
  {
    label: "Total usuarios",
    value: "248",
    description: "+12 este mes",
    icon: Users,
    color: "bg-blue-50 text-blue-600",
  },
  {
    label: "Alumnos activos",
    value: "184",
    description: "74% del total",
    icon: GraduationCap,
    color: "bg-green-50 text-green-600",
  },
  {
    label: "Cursos publicados",
    value: "36",
    description: "4 en borrador",
    icon: BookOpen,
    color: "bg-violet-50 text-violet-600",
  },
  {
    label: "Docentes",
    value: "21",
    description: "3 sin cursos asignados",
    icon: ChartCandlestickIcon,
    color: "bg-amber-50 text-amber-600",
  },
];

const recentUsers = [
  { name: "Ana Torres", role: "docente", joined: "hace 2 horas" },
  { name: "Luis Medina", role: "alumno", joined: "hace 5 horas" },
  { name: "Carmen Ruiz", role: "alumno", joined: "hace 1 día" },
  { name: "Marco Silva", role: "colaborador", joined: "hace 2 días" },
  { name: "Rosa Pérez", role: "docente", joined: "hace 3 días" },
];

const popularCourses = [
  {
    name: "Matemáticas avanzadas",
    teacher: "Ana Torres",
    enrolled: 48,
    capacity: 60,
  },
  {
    name: "Inglés intermedio",
    teacher: "Luis García",
    enrolled: 35,
    capacity: 40,
  },
  {
    name: "Historia del Perú",
    teacher: "Carmen Ruiz",
    enrolled: 29,
    capacity: 35,
  },
  {
    name: "Química general",
    teacher: "Marco Silva",
    enrolled: 22,
    capacity: 30,
  },
];

const roleStyles: Record<string, string> = {
  superadmin: "bg-blue-100 text-blue-700",
  admin: "bg-blue-100 text-blue-700",
  docente: "bg-violet-100 text-violet-700",
  alumno: "bg-green-100 text-green-700",
  colaborador: "bg-amber-100 text-amber-700",
};

const roleLabels: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  docente: "Docente",
  alumno: "Alumno",
  colaborador: "Colaborador",
};

const quickActions = [
  { label: "Nuevo usuario", icon: UserPlus, variant: "default" as const },
  { label: "Nuevo curso", icon: BookPlus, variant: "outline" as const },
  { label: "Organización", icon: Building2, variant: "outline" as const },
  { label: "Ver reportes", icon: BarChart3, variant: "outline" as const },
];

// ── Componentes ────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const role = profile?.role ?? "alumno";

  if (role === "alumno" || role === "docente") redirect("/dashboard/courses");
  return (
    <>
      <PageHeader>
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Dashboard
        </h1>
      </PageHeader>

      <main className="flex flex-col gap-6 p-6">
        {/* Bienvenida */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">
              Bienvenido de vuelta
            </h2>
            <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
              Aquí tienes un resumen de tu plataforma.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-neutral-400)]">
            <TrendingUp className="size-3.5" />
            Actualizado ahora
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-neutral-500)]">
                  {kpi.label}
                </span>
                <span
                  className={`flex items-center justify-center size-9 rounded-lg ${kpi.color}`}
                >
                  <kpi.icon className="size-4" />
                </span>
              </div>
              <div>
                <p className="text-3xl font-bold text-[var(--color-neutral-900)]">
                  {kpi.value}
                </p>
                <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">
                  {kpi.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tablas */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Usuarios recientes */}
          <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-neutral-100)]">
              <h3 className="text-sm font-semibold text-[var(--color-neutral-900)]">
                Usuarios recientes
              </h3>
              <Button variant={"link"}>
                <Link href="dashboard/users">Ver todos</Link>
              </Button>
            </div>
            <ul className="divide-y divide-[var(--color-neutral-100)]">
              {recentUsers.map((u) => (
                <li key={u.name} className="flex items-center gap-3 px-5 py-3">
                  <div className="size-8 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center text-xs font-semibold text-[var(--color-primary)] shrink-0">
                    {initials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-neutral-900)] truncate">
                      {u.name}
                    </p>
                    <p className="text-xs text-[var(--color-neutral-400)]">
                      {u.joined}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleStyles[u.role]}`}
                  >
                    {roleLabels[u.role]}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cursos más inscritos */}
          <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-neutral-100)]">
              <h3 className="text-sm font-semibold text-[var(--color-neutral-900)]">
                Cursos más inscritos
              </h3>
              <button className="text-xs text-[var(--color-primary)] hover:underline">
                Ver catálogo
              </button>
            </div>
            <ul className="divide-y divide-[var(--color-neutral-100)]">
              {popularCourses.map((course, i) => {
                const pct = Math.round(
                  (course.enrolled / course.capacity) * 100,
                );
                return (
                  <li
                    key={course.name}
                    className="px-5 py-3 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-[var(--color-neutral-300)] w-4 shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--color-neutral-900)] truncate">
                            {course.name}
                          </p>
                          <p className="text-xs text-[var(--color-neutral-400)]">
                            {course.teacher}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-[var(--color-neutral-500)] shrink-0 ml-2">
                        {course.enrolled}/{course.capacity}
                      </span>
                    </div>
                    <div className="ml-6 h-1.5 w-full rounded-full bg-[var(--color-neutral-100)]">
                      <div
                        className="h-1.5 rounded-full bg-[var(--color-primary)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-5">
          <h3 className="text-sm font-semibold text-[var(--color-neutral-900)] mb-4">
            Acciones rápidas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant}
                className={`flex flex-col h-auto py-4 gap-2 ${
                  action.variant === "default"
                    ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
                    : "border-[var(--color-neutral-200)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)]"
                }`}
              >
                <action.icon className="size-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

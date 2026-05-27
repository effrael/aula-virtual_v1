"use client";

import * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  FrameIcon,
  PieChartIcon,
  MapIcon,
  Settings,
  User,
  BookOpenTextIcon,
  Mic,
  Library,
  BadgeCheckIcon,
  LayoutDashboard,
} from "lucide-react";
import type { SettingsRow } from "@/lib/queries/settings";

type Props = React.ComponentProps<typeof Sidebar> & {
  org: Pick<SettingsRow, "name" | "tagline" | "logo_url">;
  currentUser: { name: string; email: string; role: string };
};

const NAV_DASHBOARD = {
  title: "Dashboard",
  url: "/dashboard",
  icon: <LayoutDashboard />,
};

const NAV_USUARIOS = {
  title: "Usuarios",
  url: "/dashboard/users",
  icon: <User />,
};

const NAV_CURSOS_FULL = {
  title: "Cursos",
  url: "/dashboard/courses",
  icon: <BookOpenTextIcon />,
  items: [
    { title: "Catálogo", url: "/dashboard/courses" },
    { title: "Certificados", url: "/dashboard/certificates" },
  ],
};

const NAV_CURSOS_BASICO = {
  title: "Cursos",
  url: "/dashboard/courses",
  icon: <BookOpenTextIcon />,
  items: [{ title: "Catálogo", url: "/dashboard/courses" }],
};

const NAV_ARCHIVOS = {
  title: "Medios",
  url:  "/dashboard/library",
  icon: <Library />,
};

const NAV_CONFIGURACION = {
  title: "Configuración",
  url: "/dashboard/settings/organization",
  icon: <Settings />,
};

const NAV_COMUNICACION = {
  title: "Comunicación",
  url: "/dashboard/ads",
  icon: <Mic />,
};

function getNavByRole(role: string) {
  switch (role) {
    case "superadmin":
    case "admin":
      return [NAV_DASHBOARD, NAV_CURSOS_FULL,NAV_USUARIOS, NAV_CONFIGURACION, NAV_ARCHIVOS , NAV_COMUNICACION];
    case "docente":
      return [NAV_CURSOS_BASICO, NAV_ARCHIVOS, NAV_COMUNICACION];
    case "colaborador":
      return [NAV_DASHBOARD, NAV_USUARIOS, NAV_CURSOS_FULL, NAV_ARCHIVOS, NAV_COMUNICACION];
    case "alumno":
    default:
      return [NAV_CURSOS_BASICO];
  }
}

export function AppSidebar({ currentUser, org, ...props }: Props) {
  const data = {
    user: {
      name: currentUser.name,
      email: currentUser.email,
    },
    teams: [
      {
        name: org.name,
        logo: org.logo_url ? (
          <img src={org.logo_url} alt={org.name} className="size-full object-contain rounded" />
        ) : null,
        plan: org.tagline,
      },
    ],
    navMain: getNavByRole(currentUser.role),
    projects: [
      { name: "Mis cursos", url: "/dashboard/courses", icon: <FrameIcon /> },
      { name: "Evaluaciones", url: "/dashboard/evaluaciones", icon: <PieChartIcon /> },
      { name: "Certificados", url: "/dashboard/certificates", icon: <MapIcon /> },
      { name: "Verificar Certificado", url: "/verify", icon: <BadgeCheckIcon /> },
    ],
  };
  console.log(currentUser)
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        {currentUser.role !== "alumno" && <NavMain items={data.navMain} user={currentUser} />}
        {currentUser.role === "alumno"  && <NavProjects projects={data.projects} />}
      </SidebarContent>
      <SidebarFooter>
       <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

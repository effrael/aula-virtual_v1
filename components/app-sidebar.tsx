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
  GalleryVerticalEndIcon,
  AudioLinesIcon,
  TerminalIcon,
  TerminalSquareIcon,
  BotIcon,
  BookOpenIcon,
  Settings2Icon,
  FrameIcon,
  PieChartIcon,
  MapIcon,
  Settings,
  ConciergeBell,
  User,
  BookOpenTextIcon,
  Mic,
  Library,
} from "lucide-react";

// This is sample data.
const data = {
  user: {
    name: "Efrael Villanueva",
    email: "efrael2001@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Red Cuore",
      logo: <GalleryVerticalEndIcon />,
      plan: "Plataforma virtual",
    },
    {
      name: "Acme Corp.",
      logo: <AudioLinesIcon />,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: <TerminalIcon />,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Usuarios",
      url: "/dashboard/users",
      icon: <User />,
      isActive: true,
      items: [
        {
          title: "Docentes",
          url: "/dashboard/users/doc",
        },
        {
          title: "Alumnos",
          url: "/dashboard/users/alumnos",
        },
        {
          title: "Colaboradores",
          url: "/dashboard/users/colaboradores",
        },
      ],
    },
    {
      title: "Cursos",
      url: "/dashboard/courses",
      icon: <BookOpenTextIcon />,
      items: [
        {
          title: "Catálogo",
          url: "/dashboard/courses",
        },
        {
          title: "Certificados",
          url: "/dashboard/certificates",
        },
      ],
    },
    {
      title: "Configuración",
      url: "#",
      icon: <Settings />,
      items: [
        {
          title: "Organización",
          url: "#",
        },
        {
          title: "Integraciones",
          url: "#",
        },
        {
          title: "Tutoriales",
          url: "#",
        },
      ],
    },
    {
      title: "Comunicación",
      url: "#",
      icon: <Mic />,
      items: [
        {
          title: "Anuncios",
          url: "#",
        },
        {
          title: "Recuperación ",
          url: "#",
        },
      ],
    },
    {
      title: "Archivos",
      url: "#",
      icon: <Library />,
      items: [
        {
          title: "Medios",
          url: "/dashboard/library",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Mis cursos",
      url: "#",
      icon: <FrameIcon />,
    },
    {
      name: "Evaluaciones",
      url: "#",
      icon: <PieChartIcon />,
    },
    {
      name: "Certificados",
      url: "#",
      icon: <MapIcon />,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

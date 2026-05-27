"use client";

import { useEffect, useRef, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  title: string;
  url: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  items?: { title: string; url: string }[];
};

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.items?.length) {
    return item.items.some(
      (sub) => pathname === sub.url || pathname.startsWith(sub.url + "/")
    );
  }
  return pathname === item.url || pathname.startsWith(item.url + "/");
}

export function NavMain({ items, user }: { items: NavItem[]; user?: unknown }) {
  const pathname = usePathname();

  // Inicializar abiertos según la ruta actual
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      items
        .filter((item) => item.items?.length && isItemActive(item, pathname))
        .map((item) => [item.title, true])
    )
  );

  // Cuando cambia la ruta, abrir el menú que corresponde (sin cerrar los que el usuario abrió)
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;
    items.forEach((item) => {
      if (item.items?.length && isItemActive(item, pathname)) {
        setOpenMap((prev) => ({ ...prev, [item.title]: true }));
      }
    });
  }, [pathname, items]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menú</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          item.items && item.items.length > 0 ? (
            <Collapsible
              key={item.title}
              open={openMap[item.title] ?? false}
              onOpenChange={(val) =>
                setOpenMap((prev) => ({ ...prev, [item.title]: val }))
              }
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={
                      isItemActive(item, pathname)
                        ? "bg-primary/20 text-primary font-medium"
                        : ""
                    }
                  >
                    {item.icon}
                    <span>{item.title}</span>
                    <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="my-2">
                    {item.items.map((subItem) => {
                      const isSubActive =
                        pathname === subItem.url ||
                        pathname.startsWith(subItem.url + "/");
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            className={
                              isSubActive
                                ? "bg-primary/10 text-primary font-medium"
                                : ""
                            }
                          >
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                className={
                  pathname === item.url ? "bg-primary/10 text-primary font-semibold" : ""
                }
              >
                <Link href={item.url}>
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationsBell } from "@/components/notifications-bell";

export function PageHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 bg-background flex h-14 shrink-0 items-center gap-2 border-b border-[var(--color-neutral-200)] px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-vertical:h-4 data-vertical:self-auto"
      />
      <nav className="flex items-center gap-1.5 text-sm">
       {children}
      </nav>
      <div className="ml-auto"><NotificationsBell /></div>
    </header>
  );
}

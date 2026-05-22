export const dynamic = "force-dynamic";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { NotificationsBell } from "@/components/notifications-bell";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { getSettings } from "@/lib/queries/settings";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const fullName = user?.user_metadata?.full_name ?? user?.email ?? "";
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const role = profile?.role ?? "alumno";

  return (
    <SidebarProvider>
      <AppSidebar org={settings} currentUser={{ name: fullName, email: user?.email ?? "", role }} />
      <SidebarInset>
        {/* Campana flotante — top-right de cada página */}
        <div className="absolute top-0 right-0 z-20 h-14 flex items-center pr-4 pointer-events-none">
          <div className="pointer-events-auto">
            <NotificationsBell />
          </div>
        </div>
        {/* Banners de anuncios (urgente/informativo/recordatorio) */}
        <AnnouncementBanner />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

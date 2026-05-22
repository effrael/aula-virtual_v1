import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getAnnouncements } from "@/lib/queries/announcements";
import { getCourses } from "@/lib/queries/courses";
import { AnnouncementsTable } from "./_components/announcements-table";

export default async function AdsPage() {
  const [announcements, courses] = await Promise.all([
    getAnnouncements(),
    getCourses(),
  ]);

  const coursesForForm = courses
    .filter((c) => c.status !== "archivado")
    .map((c) => ({ id: c.id, title: c.title }));

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--color-neutral-200)] px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Anuncios
        </h1>
      </header>

      <main className="flex flex-col gap-6 p-6 bg-sidebar">
        <AnnouncementsTable announcements={announcements} courses={coursesForForm} />
      </main>
    </>
  );
}

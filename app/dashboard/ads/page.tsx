import { PageHeader } from "@/components/page-header";
import { getAnnouncements } from "@/lib/queries/announcements";
import { getCourses } from "@/lib/queries/courses";
import { AnnouncementsTable } from "./_components/announcements-table";
import { requireRole } from "@/lib/auth-guard";

export default async function AdsPage() {
  await requireRole(["admin", "superadmin", "colaborador", "docente"]);
  const [announcements, courses] = await Promise.all([
    getAnnouncements(),
    getCourses(),
  ]);

  const coursesForForm = courses
    .filter((c) => c.status !== "archivado")
    .map((c) => ({ id: c.id, title: c.title }));

  return (
    <>
      <PageHeader>
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Anuncios
        </h1>
      </PageHeader>

      <main className="flex flex-col gap-6 p-6 bg-sidebar">
        <AnnouncementsTable announcements={announcements} courses={coursesForForm} />
      </main>
    </>
  );
}

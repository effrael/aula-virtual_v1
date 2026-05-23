import { PageHeader } from "@/components/page-header";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader>
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Configuración
        </h1>
      </PageHeader>

      <main className="p-6 bg-sidebar min-h-full">
        {children}
      </main>
    </>
  );
}

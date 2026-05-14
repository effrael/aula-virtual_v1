import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UsersTable } from "../_components/users-table";
import { AddUserModal } from "../_components/add-user-modal";
import { getUsersByRole } from "@/lib/queries/users";

export default async function DocentesPage() {
  const docentes = await getUsersByRole("docente");

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--color-neutral-200)] px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Usuarios / Docentes
        </h1>
      </header>

      <main className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">
            Docentes
          </h2>
          <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
            {docentes.length} docente{docentes.length !== 1 ? "s" : ""} registrado{docentes.length !== 1 ? "s" : ""} en la plataforma.
          </p>
        </div>

        <UsersTable
          role="docente"
          data={docentes}
          action={<AddUserModal role="docente" />}
        />
      </main>
    </>
  );
}

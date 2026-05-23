import { PageHeader } from "@/components/page-header";
import { UsersTable } from "./_components/users-table";
import { AddUserModal } from "./_components/add-user-modal";
import { getUsersByRole } from "@/lib/queries/users";

export default async function UsersPage() {
  const [docentes, alumnos, colaboradores] = await Promise.all([
    getUsersByRole("docente"),
    getUsersByRole("alumno"),
    getUsersByRole("colaborador"),
  ]);

  return (
    <>
      <PageHeader>
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Usuarios
        </h1>
      </PageHeader>

      <main className="flex flex-col gap-6 p-6">
        <div className="flex justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">
              Gestión de usuarios
            </h2>
            <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
              Vista general de todos los usuarios registrados en la plataforma.
            </p>
          </div>
          <div>
            <AddUserModal />
          </div>
        </div>

        <UsersTable role="docente" data={docentes} limit={5} showViewAll />
        <UsersTable role="alumno" data={alumnos} limit={5} showViewAll />
        <UsersTable role="colaborador" data={colaboradores} limit={5} showViewAll />
      </main>
    </>
  );
}

import { PageHeader } from "@/components/page-header";
import { UsersTable } from "../_components/users-table";
import { AddUserModal } from "../_components/add-user-modal";
import { getUsersByRole } from "@/lib/queries/users";

export default async function ColaboradoresPage() {
  const colaboradores = await getUsersByRole("colaborador");

  return (
    <>
      <PageHeader>
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Usuarios / Colaboradores
        </h1>
      </PageHeader>

      <main className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">
            Colaboradores
          </h2>
          <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
            {colaboradores.length} colaborador{colaboradores.length !== 1 ? "es" : ""} registrado{colaboradores.length !== 1 ? "s" : ""} en la plataforma.
          </p>
        </div>

        <UsersTable
          role="colaborador"
          data={colaboradores}
          action={<AddUserModal role="colaborador" />}
        />
      </main>
    </>
  );
}

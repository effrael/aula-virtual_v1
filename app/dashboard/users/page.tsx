import { PageHeader } from "@/components/page-header";
import { getAllUsers } from "@/lib/queries/users";
import { requireRole } from "@/lib/auth-guard";
import { UsersClient } from "./_components/users-client";

export default async function UsersPage() {
  await requireRole(["admin", "superadmin", "colaborador"]);
  const users = await getAllUsers();

  return (
    <>
      <PageHeader>
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Usuarios
        </h1>
      </PageHeader>

      <main className="p-6">
        <UsersClient users={users} />
      </main>
    </>
  );
}

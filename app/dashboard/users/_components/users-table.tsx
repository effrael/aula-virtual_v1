"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangeRoleModal } from "./change-role-modal";
import { EditUserModal } from "./edit-user-modal";
import { DeleteUserConfirm } from "./delete-user-confirm";

export type UserRow = {
  id: string;
  full_name: string;
  email: string;
  joined: string;
  status: "activo" | "inactivo";
};

type Role = "docente" | "alumno" | "colaborador";

const roleConfig: Record<
  Role,
  { label: string; color: string; viewAllHref: string }
> = {
  docente: {
    label: "Docentes",
    color: "bg-violet-100 text-violet-700",
    viewAllHref: "/dashboard/users/doc",
  },
  alumno: {
    label: "Alumnos",
    color: "bg-green-100 text-green-700",
    viewAllHref: "/dashboard/users/alumnos",
  },
  colaborador: {
    label: "Colaboradores",
    color: "bg-amber-100 text-amber-700",
    viewAllHref: "/dashboard/users/colaboradores",
  },
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface UsersTableProps {
  role: Role;
  data: UserRow[];
  limit?: number;
  showViewAll?: boolean;
  action?: React.ReactNode;
}

type ChangeRoleState = { userId: string; userName: string; currentRole: Role } | null;
type EditState = { userId: string; fullName: string; email: string } | null;
type DeleteState = { userId: string; userName: string } | null;

export function UsersTable({
  role,
  data,
  limit,
  showViewAll = false,
  action,
}: UsersTableProps) {
  const config = roleConfig[role];
  const rows = limit ? data.slice(0, limit) : data;
  const router = useRouter();

  const [changeRoleModal, setChangeRoleModal] = useState<ChangeRoleState>(null);
  const [editModal, setEditModal] = useState<EditState>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteState>(null);

  function handleSuccess() {
    router.refresh();
  }

  return (
    <>
      <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-neutral-100)]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-neutral-900)]">
              {config.label}
            </h3>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.color}`}
            >
              {data.length}
            </span>
          </div>
          {action}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-neutral-100)] bg-[var(--color-neutral-50)]">
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)]">
                  Nombre
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)] hidden sm:table-cell">
                  Correo
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)] hidden md:table-cell">
                  Registro
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-neutral-500)]">
                  Estado
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-neutral-100)]">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-[var(--color-neutral-400)]"
                  >
                    No hay {config.label.toLowerCase()} registrados.
                  </td>
                </tr>
              ) : (
                rows.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-[var(--color-neutral-50)] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center text-xs font-semibold text-[var(--color-primary)] shrink-0">
                          {initials(user.full_name)}
                        </div>
                        <span className="font-medium text-[var(--color-neutral-900)] truncate max-w-36">
                          {user.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-neutral-500)] hidden sm:table-cell">
                      {user.email}
                    </td>
                    <td className="px-5 py-3 text-[var(--color-neutral-400)] hidden md:table-cell">
                      {user.joined}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                          user.status === "activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)]"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            user.status === "activo"
                              ? "bg-green-500"
                              : "bg-[var(--color-neutral-400)]"
                          }`}
                        />
                        {user.status === "activo" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              setEditModal({
                                userId: user.id,
                                fullName: user.full_name,
                                email: user.email,
                              })
                            }
                          >
                            <Pencil className="size-3.5" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setChangeRoleModal({
                                userId: user.id,
                                userName: user.full_name,
                                currentRole: role,
                              })
                            }
                          >
                            <ArrowLeftRight className="size-3.5" />
                            Cambiar rol
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setDeleteModal({
                                userId: user.id,
                                userName: user.full_name,
                              })
                            }
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="size-3.5" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Ver todos */}
        {showViewAll && (
          <div className="px-5 py-3 border-t border-[var(--color-neutral-100)]">
            <Link
              href={config.viewAllHref}
              className="text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              Ver todos los {config.label.toLowerCase()} →
            </Link>
          </div>
        )}
      </div>

      {changeRoleModal && (
        <ChangeRoleModal
          {...changeRoleModal}
          open={!!changeRoleModal}
          onClose={() => setChangeRoleModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {editModal && (
        <EditUserModal
          {...editModal}
          open={!!editModal}
          onClose={() => setEditModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {deleteModal && (
        <DeleteUserConfirm
          {...deleteModal}
          open={!!deleteModal}
          onClose={() => setDeleteModal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}

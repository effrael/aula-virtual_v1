"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal, Pencil, Trash2, ArrowLeftRight, UserCheck, UserX,
} from "lucide-react";
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
import { activateUser, deactivateUser } from "@/app/actions/users";
import { toast } from "sonner";
import type { UserRow, UserRole } from "@/lib/queries/users";

export type { UserRow };

const roleConfig: Record<UserRole, { label: string; color: string }> = {
  docente:     { label: "Docente",     color: "bg-violet-100 text-violet-700" },
  alumno:      { label: "Alumno",      color: "bg-green-100 text-green-700"   },
  colaborador: { label: "Colaborador", color: "bg-amber-100 text-amber-700"   },
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

type ChangeRoleState = { userId: string; userName: string; currentRole: UserRole } | null;
type EditState       = { userId: string; fullName: string; email: string } | null;
type DeleteState     = { userId: string; userName: string } | null;

interface UsersTableProps {
  data: UserRow[];
}

export function UsersTable({ data }: UsersTableProps) {
  const router = useRouter();
  const [changeRoleModal, setChangeRoleModal] = useState<ChangeRoleState>(null);
  const [editModal, setEditModal]             = useState<EditState>(null);
  const [deleteModal, setDeleteModal]         = useState<DeleteState>(null);
  const [loadingId, setLoadingId]             = useState<string | null>(null);

  async function handleToggleStatus(user: UserRow) {
    setLoadingId(user.id);
    const action = user.status === "activo" ? deactivateUser : activateUser;
    const label  = user.status === "activo" ? "desactivado" : "activado";
    const res = await action(user.id);
    setLoadingId(null);
    if (res.success) {
      toast.success(`${user.full_name} fue ${label}.`);
      router.refresh();
    } else {
      toast.error(res.message ?? "Error al cambiar el estado.");
    }
  }

  return (
    <>
      <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-primary/5">
              <tr className="border-b border-[var(--color-neutral-100)] bg-primary/5 text-primary">
                <th className="text-left px-5 py-3 text-xs font-medium text-primary">Nombre</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-primary hidden sm:table-cell">Correo</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-primary]">Rol</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-primary] hidden md:table-cell">Registro</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-primary">Estado</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-primary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-neutral-100)]">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[var(--color-neutral-400)]">
                    No hay usuarios que coincidan con el filtro.
                  </td>
                </tr>
              ) : (
                data.map((user) => {
                  const cfg       = roleConfig[user.role];
                  const isLoading = loadingId === user.id;
                  return (
                    <tr key={user.id} className="hover:bg-[var(--color-neutral-50)] transition-colors">
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
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[var(--color-neutral-400)] hidden md:table-cell">
                        {user.joined}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={isLoading}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full transition-opacity ${
                            isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"
                          } ${
                            user.status === "activo"
                              ? "bg-green-100 text-green-700"
                              : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)]"
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${
                            user.status === "activo" ? "bg-green-500" : "bg-[var(--color-neutral-400)]"
                          }`} />
                          {isLoading ? "..." : user.status === "activo" ? "Activo" : "Inactivo"}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditModal({ userId: user.id, fullName: user.full_name, email: user.email })}>
                              <Pencil className="size-3.5" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChangeRoleModal({ userId: user.id, userName: user.full_name, currentRole: user.role })}>
                              <ArrowLeftRight className="size-3.5" />
                              Cambiar rol
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.status === "inactivo" ? (
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(user)}
                                disabled={isLoading}
                                className="text-green-600 focus:text-green-600 focus:bg-green-50"
                              >
                                <UserCheck className="size-3.5" />
                                Activar
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(user)}
                                  disabled={isLoading}
                                  className="text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                                >
                                  <UserX className="size-3.5" />
                                  Desactivar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteModal({ userId: user.id, userName: user.full_name })}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="size-3.5" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {changeRoleModal && (
        <ChangeRoleModal
          {...changeRoleModal}
          open={!!changeRoleModal}
          onClose={() => setChangeRoleModal(null)}
          onSuccess={() => { setChangeRoleModal(null); router.refresh(); }}
        />
      )}
      {editModal && (
        <EditUserModal
          {...editModal}
          open={!!editModal}
          onClose={() => setEditModal(null)}
          onSuccess={() => { setEditModal(null); router.refresh(); }}
        />
      )}
      {deleteModal && (
        <DeleteUserConfirm
          {...deleteModal}
          open={!!deleteModal}
          onClose={() => setDeleteModal(null)}
          onSuccess={() => { setDeleteModal(null); router.refresh(); }}
        />
      )}
    </>
  );
}

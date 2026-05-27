"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { UsersTable } from "./users-table";
import { AddUserModal } from "./add-user-modal";
import { ImportUsersModal } from "./import-users-modal";
import type { UserRow } from "@/lib/queries/users";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

interface Props {
  users: UserRow[];
}

export function UsersClient({ users }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);

  const filtered = search.trim()
    ? users.filter((u) =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">
          Gestión de usuarios
        </h2>
        <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
          {filtered.length} usuario{filtered.length !== 1 ? "s" : ""}
          {search
            ? " encontrado" + (filtered.length !== 1 ? "s" : "")
            : " registrado" + (filtered.length !== 1 ? "s" : "")}.
        </p>
      </div>

      {/* Buscador + acciones */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-neutral-400)]" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="pl-9 bg-white"
          />
        </div>
        <ImportUsersModal />
        <AddUserModal />
      </div>

      {/* Tabla */}
      <UsersTable data={paginated} />

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-[var(--color-neutral-500)]">
            Mostrando {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft className="size-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1)
                  acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-[var(--color-neutral-400)]">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={safePage === p ? "default" : "outline"}
                    size="icon"
                    className="size-8 text-xs"
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </Button>
                )
              )}

            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

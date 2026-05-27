"use client";

import Link from "next/link";
import { Award, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  id: string;
  name: string;
  description: string | null;
};

export function TemplateCard({ id, name, description }: Props) {
  return (
    <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white overflow-hidden flex flex-col">
      <div className="h-32 bg-[var(--color-neutral-100)] flex items-center justify-center border-b border-[var(--color-neutral-200)]">
        <Award className="size-10 text-[var(--color-neutral-300)]" />
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
            {name}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 shrink-0 text-[var(--color-neutral-400)]">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/certificates/${id}/designer`}>
                  Diseñar
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {description && (
          <p className="text-xs text-[var(--color-neutral-400)] line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

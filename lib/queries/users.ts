import { createClient } from "@/lib/supabase/server";
import type { UserRow } from "@/app/dashboard/users/_components/users-table";

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export async function getUsersByRole(
  role: "docente" | "alumno" | "colaborador"
): Promise<UserRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_users_by_role", {
    p_role: role,
  });

  if (error || !data) {
    console.error(`[getUsersByRole:${role}]`, error?.message);
    return [];
  }

  return data.map(
    (u: {
      id: string;
      full_name: string;
      email: string;
      status: string;
      created_at: string;
    }) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      status: u.status as "activo" | "inactivo",
      joined: formatDate(u.created_at),
    })
  );
}

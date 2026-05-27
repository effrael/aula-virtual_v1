import { createClient } from "@/lib/supabase/server";

export type UserRole = "docente" | "alumno" | "colaborador";

export type UserRow = {
  id: string;
  full_name: string;
  email: string;
  joined: string;
  status: "activo" | "inactivo";
  role: UserRole;
};

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export async function getUsersByRole(role: UserRole): Promise<UserRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_users_by_role", {
    p_role: role,
  });

  if (error || !data) {
    console.error(`[getUsersByRole:${role}]`, error?.message);
    return [];
  }

  return data.map(
    (u: { id: string; full_name: string; email: string; status: string; created_at: string }) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      status: u.status as "activo" | "inactivo",
      joined: formatDate(u.created_at),
      role,
    })
  );
}

export async function getAllUsers(): Promise<UserRow[]> {
  const [docentes, alumnos, colaboradores] = await Promise.all([
    getUsersByRole("docente"),
    getUsersByRole("alumno"),
    getUsersByRole("colaborador"),
  ]);
  return [...docentes, ...alumnos, ...colaboradores].sort((a, b) =>
    a.full_name.localeCompare(b.full_name)
  );
}

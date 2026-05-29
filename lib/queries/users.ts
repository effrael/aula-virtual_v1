import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type UserRole = "docente" | "alumno" | "colaborador";

export type UserRow = {
  id: string;
  full_name: string;
  apellidos: string;
  dni: string;
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

  // Fetch apellidos y dni de profiles (columnas nuevas no incluidas en el RPC)
  const ids = (data as { id: string }[]).map((u) => u.id);
  const { data: extras } = await supabaseAdmin
    .from("profiles")
    .select("id, apellidos, dni")
    .in("id", ids);

  const extrasMap = new Map((extras ?? []).map((e) => [e.id, e]));

  return data.map(
    (u: { id: string; full_name: string; email: string; status: string; created_at: string }) => ({
      id: u.id,
      full_name: u.full_name,
      apellidos: extrasMap.get(u.id)?.apellidos ?? "",
      dni: extrasMap.get(u.id)?.dni ?? "",
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

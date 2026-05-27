import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Returns the current user's role. Redirects to /dashboard/courses
 * if the role is not in the allowedRoles list.
 */
export async function requireRole(allowedRoles: string[]): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "alumno";

  if (!allowedRoles.includes(role)) {
    redirect("/dashboard/courses");
  }

  return role;
}

/**
 * Returns the current user's role from a server action context.
 * Returns null if unauthenticated.
 */
export async function getActionRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role ?? "alumno";
}

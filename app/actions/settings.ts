"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ── updateOrgSettings ─────────────────────────────────────────────────────────

const OrgSettingsSchema = z.object({
  name: z.string().min(1, { message: "El nombre es requerido." }).trim(),
  tagline: z.string().min(1, { message: "El tagline es requerido." }).trim(),
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { message: "Color inválido." }),
  logo_url: z.string().url().nullable().optional(),
});

export type OrgSettingsState =
  | { errors?: { name?: string[]; tagline?: string[]; primary_color?: string[] }; message?: string; success?: boolean }
  | undefined;

export async function updateOrgSettings(
  _prev: OrgSettingsState,
  formData: FormData
): Promise<OrgSettingsState> {
  const rawLogo = formData.get("logo_url");

  const parsed = OrgSettingsSchema.safeParse({
    name: formData.get("name"),
    tagline: formData.get("tagline"),
    primary_color: formData.get("primary_color"),
    logo_url: rawLogo && rawLogo !== "" ? rawLogo : null,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { name, tagline, primary_color, logo_url } = parsed.data;

  const { error } = await supabaseAdmin
    .from("settings")
    .upsert(
      { id: 1, name, tagline, primary_color, logo_url: logo_url ?? null, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (error) {
    console.error("[updateOrgSettings]", error.message);
    return { message: "No se pudo guardar la configuración." };
  }

  revalidatePath("/dashboard/settings/organization");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

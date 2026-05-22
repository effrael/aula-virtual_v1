import { supabaseAdmin } from "@/lib/supabase/admin";

export type SettingsRow = {
  name: string;
  tagline: string;
  logo_url: string | null;
  primary_color: string;
};

export async function getSettings(): Promise<SettingsRow> {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("name, tagline, logo_url, primary_color")
    .eq("id", 1)
    .single();

  return data ?? { name: "Mi Institución", tagline: "Plataforma virtual", logo_url: null, primary_color: "#000000" };
}

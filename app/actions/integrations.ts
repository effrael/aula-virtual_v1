"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const REVALIDATE = "/dashboard/settings/integrations";

// ── saveGoogleMeetCredentials ─────────────────────────────────────────────────

const GoogleMeetSchema = z.object({
  client_id: z.string().min(1, { message: "Client ID requerido." }).trim(),
  client_secret: z.string().min(1, { message: "Client Secret requerido." }).trim(),
  enabled: z.boolean(),
});

export type GoogleMeetState =
  | { errors?: { client_id?: string[]; client_secret?: string[] }; message?: string; success?: boolean }
  | undefined;

export async function saveGoogleMeetCredentials(
  _prev: GoogleMeetState,
  formData: FormData
): Promise<GoogleMeetState> {
  const parsed = GoogleMeetSchema.safeParse({
    client_id: formData.get("client_id"),
    client_secret: formData.get("client_secret"),
    enabled: formData.get("enabled") === "true",
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { client_id, client_secret, enabled } = parsed.data;
  const credentials = encrypt(JSON.stringify({ client_id, client_secret }));

  const { error } = await supabaseAdmin
    .from("integrations")
    .upsert(
      { id: "google_meet", enabled, credentials, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (error) {
    console.error("[saveGoogleMeetCredentials]", error.message);
    return { message: "No se pudieron guardar las credenciales." };
  }

  revalidatePath(REVALIDATE);
  return { success: true };
}

// ── toggleIntegration ─────────────────────────────────────────────────────────

export async function toggleIntegration(
  id: string,
  enabled: boolean
): Promise<{ success?: boolean; message?: string }> {
  const { error } = await supabaseAdmin
    .from("integrations")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[toggleIntegration]", error.message);
    return { message: "No se pudo actualizar la integración." };
  }

  revalidatePath(REVALIDATE);
  return { success: true };
}

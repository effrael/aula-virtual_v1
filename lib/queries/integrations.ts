import { supabaseAdmin } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";

export type GoogleMeetCredentials = {
  client_id: string;
  client_secret: string;
};

export type GoogleMeetIntegration = {
  enabled: boolean;
  credentials: GoogleMeetCredentials | null;
};

export async function getGoogleMeetIntegration(): Promise<GoogleMeetIntegration> {
  const { data } = await supabaseAdmin
    .from("integrations")
    .select("enabled, credentials")
    .eq("id", "google_meet")
    .single();

  if (!data) return { enabled: false, credentials: null };

  let credentials: GoogleMeetCredentials | null = null;
  if (data.credentials) {
    try {
      credentials = JSON.parse(decrypt(data.credentials));
    } catch {
      credentials = null;
    }
  }

  return { enabled: data.enabled, credentials };
}

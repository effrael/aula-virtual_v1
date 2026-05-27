import { getGoogleMeetIntegration } from "@/lib/queries/integrations";
import { GoogleMeetForm } from "./_components/google-meet-form";
import { requireRole } from "@/lib/auth-guard";

export default async function IntegrationsPage() {
  await requireRole(["admin", "superadmin"]);
  const googleMeet = await getGoogleMeetIntegration();

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">Integraciones</h2>
        <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
          Conecta servicios externos a la plataforma. Las credenciales se guardan encriptadas.
        </p>
      </div>

      <GoogleMeetForm integration={googleMeet} />
    </div>
  );
}

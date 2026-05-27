import { getSettings } from "@/lib/queries/settings";
import { ShieldCheck } from "lucide-react";
import { VerifyForm } from "./_components/verify-form";

export default async function VerifyLandingPage() {
  const settings = await getSettings();

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        {/* Logo */}
        {settings.logo_url ? (
          <img
            src={settings.logo_url}
            alt={settings.name}
            className="h-12 object-contain"
          />
        ) : (
          <p className="text-lg font-bold text-[var(--color-neutral-900)]">
            {settings.name}
          </p>
        )}

        <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-8 w-full flex flex-col items-center gap-5">
          <ShieldCheck className="size-10 text-[var(--color-primary)]" />
          <div className="text-center">
            <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">
              Verificar Certificado
            </h1>
            <p className="text-sm text-[var(--color-neutral-500)] mt-1">
              Ingresa el código de verificación para validar un certificado.
            </p>
          </div>

          <VerifyForm />
        </div>
      </div>
    </div>
  );
}

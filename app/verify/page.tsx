import { getSettings } from "@/lib/queries/settings";
import { Award } from "lucide-react";
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
            className="h-10 object-contain"
          />
        ) : (
          <p className="text-lg font-bold text-[var(--color-neutral-900)]">
            {settings.name}
          </p>
        )}

        <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-8 w-full flex flex-col gap-5 shadow-sm">
          {/* Ícono */}
          <div className="size-12 rounded-xl bg-[var(--color-primary-soft)] flex items-center justify-center">
            <Award className="size-6 text-[var(--color-primary)]" />
          </div>

          {/* Texto */}
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-bold text-[var(--color-neutral-900)]">
              Verificar certificado
            </h1>
            <p className="text-sm text-[var(--color-neutral-500)]">
              Ingresa el código impreso en el certificado para comprobar su autenticidad.
            </p>
          </div>

          <VerifyForm />
        </div>
      </div>
    </div>
  );
}

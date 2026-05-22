"use client";

import { useActionState, useTransition, useState, useEffect } from "react";
import { toast } from "sonner";
import { Video, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveGoogleMeetCredentials, toggleIntegration } from "@/app/actions/integrations";
import type { GoogleMeetIntegration } from "@/lib/queries/integrations";

type Props = { integration: GoogleMeetIntegration };

export function GoogleMeetForm({ integration }: Props) {
  const [state, formAction, pending] = useActionState(saveGoogleMeetCredentials, undefined);
  const [enabled, setEnabled] = useState(integration.enabled);
  const [showSecret, setShowSecret] = useState(false);
  const [togglePending, startToggle] = useTransition();

  useEffect(() => {
    if (state?.success) toast.success("Credenciales guardadas.");
    else if (state?.message) toast.error(state.message);
  }, [state]);

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    startToggle(async () => {
      const result = await toggleIntegration("google_meet", next);
      if (!result.success) {
        setEnabled(!next); // revert
        toast.error(result.message ?? "Error al cambiar estado.");
      } else {
        toast.success(next ? "Google Meet activado." : "Google Meet desactivado.");
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--color-neutral-200)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[var(--color-neutral-100)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center size-9 rounded-lg bg-blue-50">
            <Video className="size-5 text-blue-600" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-neutral-900)]">Google Meet</p>
            <p className="text-xs text-[var(--color-neutral-500)]">
              Crea reuniones desde la plataforma
            </p>
          </div>
        </div>

        {/* Toggle habilitado/deshabilitado */}
        <div className="flex items-center gap-2 shrink-0">
          {enabled ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle2 className="size-3.5" />
              Activo
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-[var(--color-neutral-400)]">
              <XCircle className="size-3.5" />
              Inactivo
            </span>
          )}
          <button
            type="button"
            disabled={togglePending}
            onClick={handleToggle}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${
              enabled ? "bg-primary" : "bg-[var(--color-neutral-200)]"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
                enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Formulario de credenciales */}
      <form action={formAction} className="flex flex-col gap-4 p-5">
        <input type="hidden" name="enabled" value={String(enabled)} />

        <p className="text-xs text-[var(--color-neutral-500)]">
          Obtén estas credenciales en{" "}
          <span className="font-medium text-[var(--color-neutral-700)]">
            Google Cloud Console → APIs → OAuth 2.0
          </span>
          . Las credenciales se guardan encriptadas con AES-256.
        </p>

        {/* Client ID */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="client_id" className="text-sm font-medium text-[var(--color-neutral-900)]">
            Client ID
          </label>
          <input
            id="client_id"
            name="client_id"
            type="text"
            defaultValue={integration.credentials?.client_id ?? ""}
            placeholder="xxx.apps.googleusercontent.com"
            className="h-9 w-full rounded-md border border-[var(--color-neutral-200)] bg-white px-3 font-mono text-sm text-[var(--color-neutral-900)] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {state?.errors?.client_id && (
            <p className="text-xs text-destructive">{state.errors.client_id[0]}</p>
          )}
        </div>

        {/* Client Secret */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="client_secret" className="text-sm font-medium text-[var(--color-neutral-900)]">
            Client Secret
          </label>
          <div className="relative">
            <input
              id="client_secret"
              name="client_secret"
              type={showSecret ? "text" : "password"}
              defaultValue={integration.credentials?.client_secret ?? ""}
              placeholder="GOCSPX-…"
              className="h-9 w-full rounded-md border border-[var(--color-neutral-200)] bg-white px-3 pr-9 font-mono text-sm text-[var(--color-neutral-900)] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-700)]"
            >
              {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {state?.errors?.client_secret && (
            <p className="text-xs text-destructive">{state.errors.client_secret[0]}</p>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "Guardando…" : "Guardar credenciales"}
          </Button>
        </div>
      </form>
    </div>
  );
}

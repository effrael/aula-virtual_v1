"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/media-picker";
import { updateOrgSettings } from "@/app/actions/settings";
import { LIBRARY_BUCKET } from "@/lib/storage-utils";
import type { SettingsRow } from "@/lib/queries/settings";
import type { StorageFile } from "@/lib/storage-utils";

type Props = {
  settings: SettingsRow;
  libraryFiles: StorageFile[];
};

export function OrganizationForm({ settings, libraryFiles }: Props) {
  const [state, formAction, pending] = useActionState(
    updateOrgSettings,
    undefined,
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(settings.logo_url);
  const [color, setColor] = useState(settings.primary_color);

  if (state?.success) toast.success("Configuración guardada.");
  if (state?.message) toast.error(state.message);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Logo */}
      <div className="bg-white rounded-xl border border-[var(--color-neutral-200)] p-5 flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--color-neutral-900)]">
            Logo
          </p>
          <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
            Selecciona desde la biblioteca o sube una nueva imagen.
          </p>
        </div>

        <input type="hidden" name="logo_url" value={logoUrl ?? ""} />

        <MediaPicker
          bucket={LIBRARY_BUCKET}
          value={logoUrl}
          onChange={setLogoUrl}
          initialFiles={libraryFiles}
          accept="image"
        />
        <div className="mt-6 flex flex-col gap-4">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="name"
              className="text-sm font-medium text-[var(--color-neutral-900)]"
            >
              Nombre de la institución
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={settings.name}
              placeholder="Red Cuore"
              className="h-9 w-full rounded-md border border-[var(--color-neutral-200)] bg-white px-3 text-sm text-[var(--color-neutral-900)] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {state?.errors?.name && (
              <p className="text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>

          {/* Tagline */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="tagline"
              className="text-sm font-medium text-[var(--color-neutral-900)]"
            >
              Descripción de la plataforma
            </label>
            <input
              id="tagline"
              name="tagline"
              type="text"
              defaultValue={settings.tagline}
              placeholder="Plataforma virtual"
              className="h-9 w-full rounded-md border border-[var(--color-neutral-200)] bg-white px-3 text-sm text-[var(--color-neutral-900)] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-[var(--color-neutral-400)]">
              Aparece debajo del nombre en el sidebar.
            </p>
            {state?.errors?.tagline && (
              <p className="text-xs text-destructive">
                {state.errors.tagline[0]}
              </p>
            )}
          </div>

          {/* Color primario */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="primary_color_hex"
              className="text-sm font-medium text-[var(--color-neutral-900)]"
            >
              Color primario
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-9 shrink-0 cursor-pointer rounded-md border border-[var(--color-neutral-200)] p-0.5 bg-white"
              />
              <input
                id="primary_color_hex"
                name="primary_color"
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                maxLength={7}
                placeholder="#000000"
                className="h-9 w-32 rounded-md border border-[var(--color-neutral-200)] bg-white px-3 font-mono text-sm text-[var(--color-neutral-900)] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-xs text-[var(--color-neutral-400)]">
                Hexadecimal, ej. #3b82f6
              </span>
            </div>
            {state?.errors?.primary_color && (
              <p className="text-xs text-destructive">
                {state.errors.primary_color[0]}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>

      {/* Nombre + Tagline + Color */}
    </form>
  );
}

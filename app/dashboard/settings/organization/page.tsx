import { getSettings } from "@/lib/queries/settings";
import { getStorageFiles } from "@/lib/queries/storage";
import { LIBRARY_BUCKET } from "@/lib/storage-utils";
import { OrganizationForm } from "./_components/organization-form";
import { requireRole } from "@/lib/auth-guard";

export default async function OrganizationPage() {
  await requireRole(["admin", "superadmin"]);
  const [settings, libraryFiles] = await Promise.all([
    getSettings(),
    getStorageFiles(LIBRARY_BUCKET),
  ]);

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">Organización</h2>
        <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
          Configura la identidad visual de tu institución.
        </p>
      </div>

      <OrganizationForm settings={settings} libraryFiles={libraryFiles} />
    </div>
  );
}

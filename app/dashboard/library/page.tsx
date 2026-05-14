import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { HardDrive, Files } from "lucide-react";
import { getStorageFiles } from "@/lib/queries/storage";
import { getFileCategory } from "@/lib/storage-utils";
import { getVideos } from "@/lib/queries/videos";
import type { VideoRow } from "@/lib/storage-utils";
import { formatBytes } from "@/lib/utils";
import { LIBRARY_BUCKET } from "@/lib/storage-utils";
import { LibraryGrid } from "./_components/library-grid";

export default async function LibraryPage() {
  const [files, videos] = await Promise.all([
    getStorageFiles(LIBRARY_BUCKET),
    getVideos(),
  ]);

  const totalStorageSize = files.reduce((acc, f) => acc + f.size, 0);
  const imageCount = files.filter((f) => getFileCategory(f.mimetype) === "image").length;
  const docCount = files.length - imageCount;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--color-neutral-200)] px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Biblioteca de medios
        </h1>
      </header>

      <main className="flex flex-col gap-6 p-6 bg-sidebar">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">
            Biblioteca de medios
          </h2>
          <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
            Gestiona todos los archivos subidos a la plataforma.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-5 flex items-center gap-4">
            <span className="flex items-center justify-center size-10 rounded-lg shrink-0 bg-violet-50 text-violet-600">
              <Files className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold text-[var(--color-neutral-900)]">
                {files.length + videos.length}
              </p>
              <p className="text-xs text-[var(--color-neutral-500)]">
                {imageCount} imágenes · {docCount} docs · {videos.length} videos
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-5 flex items-center gap-4">
            <span className="flex items-center justify-center size-10 rounded-lg shrink-0 bg-blue-50 text-blue-600">
              <HardDrive className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold text-[var(--color-neutral-900)]">
                {formatBytes(totalStorageSize)}
              </p>
              <p className="text-xs text-[var(--color-neutral-500)]">
                Supabase Storage
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-5 flex items-center gap-4">
            <span className="flex items-center justify-center size-10 rounded-lg shrink-0 bg-green-50 text-green-600">
              <HardDrive className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold text-[var(--color-neutral-900)]">
                {videos.length > 0
                  ? formatBytes(videos.reduce((acc, v) => acc + (v.file_size ?? 0), 0))
                  : "0 B"}
              </p>
              <p className="text-xs text-[var(--color-neutral-500)]">
                Videos (VPS)
              </p>
            </div>
          </div>
        </div>

        <LibraryGrid bucket={LIBRARY_BUCKET} initialFiles={files} initialVideos={videos} />
      </main>
    </>
  );
}

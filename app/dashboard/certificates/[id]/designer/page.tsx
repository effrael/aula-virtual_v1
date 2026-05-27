import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-guard";
import { PageHeader } from "@/components/page-header";
import { DesignerLoader } from "./_components/designer-loader";

export default async function DesignerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "superadmin", "colaborador", "docente"]);

  const { id } = await params;

  const { data: template, error } = await supabaseAdmin
    .from("certificate_templates")
    .select("id, name, pdf_url, pdfme_template")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !template) redirect("/dashboard/certificates");

  return (
    <>
      <PageHeader>
        <h1 className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Diseñar: {template.name}
        </h1>
      </PageHeader>

      <main className="flex flex-col gap-4 p-6 h-[calc(100vh-4rem)]">
        <DesignerLoader
          templateId={template.id}
          pdfUrl={template.pdf_url}
          pdfmeTemplate={template.pdfme_template as Record<string, unknown>}
        />
      </main>
    </>
  );
}

"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getActionRole } from "@/lib/auth-guard";

const REVALIDATE = "/dashboard/certificates";

export type CertificateTemplate = {
  id: string;
  name: string;
  description: string | null;
  pdf_url: string;
  pdfme_template: Record<string, unknown>;
  created_at: string;
};

// ── getCertificateTemplates ──────────────────────────────────────────────────

export async function getCertificateTemplates(): Promise<CertificateTemplate[]> {
  const { data, error } = await supabaseAdmin
    .from("certificate_templates")
    .select("id, name, description, pdf_url, pdfme_template, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[getCertificateTemplates]", error?.message);
    return [];
  }

  return data as CertificateTemplate[];
}

// ── createCertificateTemplate ────────────────────────────────────────────────

export async function createCertificateTemplate(
  name: string,
  description: string | null,
  pdfUrl: string
): Promise<{ success?: boolean; message?: string; id?: string }> {
  const role = await getActionRole();
  if (!role || role === "alumno") return { message: "Sin permisos." };

  const { data, error } = await supabaseAdmin
    .from("certificate_templates")
    .insert({ name, description, pdf_url: pdfUrl })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createCertificateTemplate]", error?.message);
    return { message: "No se pudo crear la plantilla." };
  }

  revalidatePath(REVALIDATE);
  return { success: true, id: data.id };
}

// ── updateCertificateTemplate ────────────────────────────────────────────────

export async function updateCertificateTemplate(
  id: string,
  data: { name?: string; description?: string | null; pdf_url?: string; pdfme_template?: Record<string, unknown> }
): Promise<{ success?: boolean; message?: string }> {
  const role = await getActionRole();
  if (!role || role === "alumno") return { message: "Sin permisos." };

  const { error } = await supabaseAdmin
    .from("certificate_templates")
    .update(data)
    .eq("id", id);

  if (error) {
    console.error("[updateCertificateTemplate]", error.message);
    return { message: "No se pudo actualizar la plantilla." };
  }

  revalidatePath(REVALIDATE);
  return { success: true };
}

// ── savePdfmeTemplate ────────────────────────────────────────────────────────

export async function savePdfmeTemplate(
  id: string,
  pdfmeTemplate: Record<string, unknown>
): Promise<{ success?: boolean; message?: string }> {
  const role = await getActionRole();
  if (!role || role === "alumno") return { message: "Sin permisos." };

  const { error } = await supabaseAdmin
    .from("certificate_templates")
    .update({ pdfme_template: pdfmeTemplate })
    .eq("id", id);

  if (error) {
    console.error("[savePdfmeTemplate]", error.message);
    return { message: "No se pudo guardar el diseño." };
  }

  revalidatePath(REVALIDATE);
  return { success: true };
}

// ── deleteCertificateTemplate (soft delete) ──────────────────────────────────

export async function deleteCertificateTemplate(
  id: string
): Promise<{ success?: boolean; message?: string }> {
  const role = await getActionRole();
  if (!role || role === "alumno") return { message: "Sin permisos." };

  const { error } = await supabaseAdmin
    .from("certificate_templates")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[deleteCertificateTemplate]", error.message);
    return { message: "No se pudo eliminar la plantilla." };
  }

  revalidatePath(REVALIDATE);
  return { success: true };
}

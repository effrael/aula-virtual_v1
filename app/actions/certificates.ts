"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { generate } from "@pdfme/generator";
import { text, image, barcodes } from "@pdfme/schemas";

// ── Types ─────────────────────────────────────────────────────────────────────

export type IssuedCertificate = {
  id: string;
  student_name: string;
  course_title: string;
  template_name: string | null;
  verification_code: string;
  pdf_url: string | null;
  score: number | null;
  issued_at: string;
};

export type StudentCertificate = {
  id: string;
  course_title: string;
  verification_code: string;
  pdf_url: string | null;
  score: number | null;
  issued_at: string;
};

export type CertificateVerification = {
  student_name: string;
  course_title: string;
  score: number | null;
  issued_at: string;
  verification_code: string;
  pdf_url: string | null;
};

export type CertificatesStats = {
  total: number;
  byCourse: { course_title: string; count: number }[];
};

// ── generateCertificate ──────────────────────────────────────────────────────

export async function generateCertificate(
  studentId: string,
  courseId: string,
  score: number,
  templateId?: string,
  customInputs?: Record<string, string>
): Promise<{ certificateId?: string; verificationCode?: string; pdfUrl?: string; message?: string }> {
  // Build template query — use specific template if provided, otherwise grab first available
  const templateQuery = templateId
    ? supabaseAdmin
        .from("certificate_templates")
        .select("id, pdf_url, pdfme_template")
        .eq("id", templateId)
        .is("deleted_at", null)
        .single()
    : supabaseAdmin
        .from("certificate_templates")
        .select("id, pdf_url, pdfme_template")
        .is("deleted_at", null)
        .limit(1)
        .single();

  // Get template, student and course in parallel
  const [{ data: template }, { data: student }, { data: course }] = await Promise.all([
    templateQuery,
    supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", studentId)
      .single(),
    supabaseAdmin
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single(),
  ]);

  if (!student || !course) {
    return { message: "No se encontraron datos del alumno o curso." };
  }

  // 1. Insert certificate first (to get verification_code for the QR)
  const { data: cert, error } = await supabaseAdmin
    .from("certificates")
    .insert({
      student_id: studentId,
      course_id: courseId,
      template_id: template?.id ?? null,
      pdf_url: null,
      score,
    })
    .select("id, verification_code")
    .single();

  if (error || !cert) {
    console.error("[generateCertificate]", error?.message);
    return { message: "No se pudo emitir el certificado." };
  }

  // 2. Generate PDF if template has a pdfme design
  let pdfUrl: string | null = null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify/${cert.verification_code}`;

  if (template && template.pdfme_template && Object.keys(template.pdfme_template).length > 0) {
    try {
      const pdfmeTemplate = template.pdfme_template as any;
      const basePdfResponse = await fetch(template.pdf_url);
      const basePdf = new Uint8Array(await basePdfResponse.arrayBuffer());

      const templateForGeneration = {
        ...pdfmeTemplate,
        basePdf,
      };

      // Auto-filled fields from the system
      const autoFields: Record<string, string> = {
        nombre: student.full_name ?? "",
        curso: course.title ?? "",
        fecha: new Date().toLocaleDateString("es-PE", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        nota: String(score),
        codigo: cert.verification_code,
        qr: verifyUrl,
      };

      // Merge auto-filled with custom inputs (custom overrides auto if same key)
      const inputs = [{ ...autoFields, ...(customInputs ?? {}) }];

      const pdf = await generate({
        template: templateForGeneration,
        inputs,
        plugins: { text, image, ...barcodes },
      });

      const timestamp = Date.now();
      const filePath = `certificates/${courseId}/${studentId}/${timestamp}.pdf`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("library")
        .upload(filePath, pdf, { contentType: "application/pdf" });

      if (!uploadError) {
        const { data: publicData } = supabaseAdmin.storage
          .from("library")
          .getPublicUrl(filePath);
        pdfUrl = publicData.publicUrl;
      }
    } catch (err) {
      console.error("[generateCertificate] PDF generation error:", err);
    }
  }

  // 3. Update certificate with PDF URL if generated
  if (pdfUrl) {
    await supabaseAdmin
      .from("certificates")
      .update({ pdf_url: pdfUrl })
      .eq("id", cert.id);
  }

  return {
    certificateId: cert.id,
    verificationCode: cert.verification_code,
    pdfUrl,
  };
}

// ── getCertificatesByStudent ─────────────────────────────────────────────────

export async function getCertificatesByStudent(studentId: string): Promise<StudentCertificate[]> {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select("id, verification_code, pdf_url, score, issued_at, course:courses!course_id(title)")
    .eq("student_id", studentId)
    .order("issued_at", { ascending: false });

  if (error || !data) {
    console.error("[getCertificatesByStudent]", error?.message);
    return [];
  }

  return data.map((c: any) => ({
    id: c.id,
    course_title: c.course?.title ?? "",
    verification_code: c.verification_code,
    pdf_url: c.pdf_url,
    score: c.score,
    issued_at: c.issued_at,
  }));
}

// ── getCertificateByCode ─────────────────────────────────────────────────────

export async function getCertificateByCode(code: string): Promise<CertificateVerification | null> {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select("verification_code, pdf_url, score, issued_at, student:profiles!student_id(full_name), course:courses!course_id(title)")
    .eq("verification_code", code)
    .maybeSingle();

  if (error || !data) {
    console.error("[getCertificateByCode]", error?.message);
    return null;
  }

  return {
    student_name: (data.student as any)?.full_name ?? "",
    course_title: (data.course as any)?.title ?? "",
    score: data.score,
    issued_at: data.issued_at,
    verification_code: data.verification_code,
    pdf_url: data.pdf_url,
  };
}

// ── getIssuedCertificates ────────────────────────────────────────────────────

export async function getIssuedCertificates(): Promise<IssuedCertificate[]> {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select(`
      id, verification_code, pdf_url, score, issued_at,
      student:profiles!student_id(full_name),
      course:courses!course_id(title),
      template:certificate_templates!template_id(name)
    `)
    .order("issued_at", { ascending: false });

  if (error || !data) {
    console.error("[getIssuedCertificates]", error?.message);
    return [];
  }

  return data.map((c: any) => ({
    id: c.id,
    student_name: c.student?.full_name ?? "",
    course_title: c.course?.title ?? "",
    template_name: c.template?.name ?? null,
    verification_code: c.verification_code,
    pdf_url: c.pdf_url,
    score: c.score,
    issued_at: c.issued_at,
  }));
}

// ── getCertificatesStats ─────────────────────────────────────────────────────

export async function getCertificatesStats(): Promise<CertificatesStats> {
  const { count } = await supabaseAdmin
    .from("certificates")
    .select("id", { count: "exact", head: true });

  const { data: byCourseData } = await supabaseAdmin
    .from("certificates")
    .select("course:courses!course_id(title)");

  const courseMap = new Map<string, number>();
  for (const row of byCourseData ?? []) {
    const title = (row.course as any)?.title ?? "Sin curso";
    courseMap.set(title, (courseMap.get(title) ?? 0) + 1);
  }

  const byCourse = Array.from(courseMap.entries())
    .map(([course_title, count]) => ({ course_title, count }))
    .sort((a, b) => b.count - a.count);

  return { total: count ?? 0, byCourse };
}

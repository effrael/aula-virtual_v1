"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { generate } from "@pdfme/generator";
import { text, image, barcodes } from "@pdfme/schemas";
import { getCertificateFonts } from "@/lib/certificate-fonts";
import { getActionRole } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

// ── Types ─────────────────────────────────────────────────────────────────────

export type IssuedCertificate = {
  id: string;
  student_name: string;
  course_title: string;
  template_name: string | null;
  verification_code: string;
  certificate_code: string | null;
  pdf_url: string | null;
  score: number | null;
  issued_at: string;
};

export type StudentCertificate = {
  id: string;
  course_title: string;
  verification_code: string;
  certificate_code: string | null;
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
  certificate_code: string | null;
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
  score: number | null = null,
  templateId?: string,
  customInputs?: Record<string, string>
): Promise<{ certificateId?: string; verificationCode?: string; pdfUrl?: string; message?: string }> {
  // Get course with certificate config
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("title, certificate_template_id, certificate_description")
    .eq("id", courseId)
    .single();

  if (!course) {
    return { message: "No se encontró el curso." };
  }

  // Resolve template: explicit > course config > first available
  const resolvedTemplateId = templateId ?? (course as any).certificate_template_id ?? null;

  const templateQuery = resolvedTemplateId
    ? supabaseAdmin
        .from("certificate_templates")
        .select("id, pdf_url, pdfme_template, custom_fonts")
        .eq("id", resolvedTemplateId)
        .is("deleted_at", null)
        .single()
    : supabaseAdmin
        .from("certificate_templates")
        .select("id, pdf_url, pdfme_template, custom_fonts")
        .is("deleted_at", null)
        .limit(1)
        .single();

  // Get template and student in parallel
  const [{ data: template }, { data: student }] = await Promise.all([
    templateQuery as Promise<{ data: { id: string; pdf_url: string; pdfme_template: any; custom_fonts?: any[] } | null }>,
    supabaseAdmin
      .from("profiles")
      .select("full_name, apellidos, dni")
      .eq("id", studentId)
      .single(),
  ]);

  if (!student) {
    return { message: "No se encontró el alumno." };
  }

  // Derive nombre (first name) from full_name minus apellidos
  const apellidos = student.apellidos ?? "";
  const nombre = apellidos
    ? (student.full_name ?? "").replace(apellidos, "").trim()
    : (student.full_name ?? "");
  const dni = student.dni ?? "";

  // Use provided code or auto-generate sequential one
  let certificateCode = customInputs?.codigo?.trim() ?? "";
  if (!certificateCode) {
    const year = new Date().getFullYear().toString().slice(-2);
    const { data: seqNum } = await supabaseAdmin.rpc("next_certificate_number");
    const seq = String(seqNum ?? 1).padStart(4, "0");
    certificateCode = `RC-${seq}-${year}`;
  }

  // Insert certificate first (to get verification_code for QR)
  const { data: cert, error } = await supabaseAdmin
    .from("certificates")
    .insert({
      student_id: studentId,
      course_id: courseId,
      template_id: template?.id ?? null,
      pdf_url: null,
      score,
      certificate_code: certificateCode,
    })
    .select("id, verification_code")
    .single();

  if (error || !cert) {
    console.error("[generateCertificate]", error?.message);
    return { message: "No se pudo emitir el certificado." };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify/${cert.verification_code}`;

  // Generate PDF if template has a pdfme design
  let pdfUrl: string | null = null;
  let pdfError: string | null = null;

  if (template && template.pdfme_template && Object.keys(template.pdfme_template).length > 0) {
    try {
      const pdfmeTemplate = template.pdfme_template as any;
      const basePdfResponse = await fetch(template.pdf_url);
      const basePdf = new Uint8Array(await basePdfResponse.arrayBuffer());

      const templateForGeneration = { ...pdfmeTemplate, basePdf };

      const autoFields: Record<string, string> = {
        nombre,
        apellidos,
        dni,
        codigo: certificateCode,
        qr: verifyUrl,
      };

      const extraCustom = customInputs
        ? Object.fromEntries(
            Object.entries(customInputs).filter(
              ([k]) => !["nombre", "apellidos", "dni", "codigo", "qr"].includes(k)
            )
          )
        : {};

      // Use schema content as fallback for any field not covered by autoFields or extraCustom
      const schemaDefaults: Record<string, string> = {};
      for (const page of (pdfmeTemplate.schemas as any[][]) ?? []) {
        for (const field of page ?? []) {
          if (
            field?.name &&
            !(field.name in autoFields) &&
            !(field.name in extraCustom) &&
            field.content
          ) {
            schemaDefaults[field.name] = field.content;
          }
        }
      }

      const inputs = [{ ...schemaDefaults, ...extraCustom, ...autoFields }];

      const fontMap = await getCertificateFonts((template as any).custom_fonts ?? []);

      const pdf = await generate({
        template: templateForGeneration,
        inputs,
        plugins: { text, image, ...barcodes },
        options: { font: fontMap },
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
      pdfError = err instanceof Error ? err.message : String(err);
      console.error("[generateCertificate] PDF generation error:", pdfError);
    }
  }

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
    pdfError,
  };
}

// ── getCertificatesByStudent ─────────────────────────────────────────────────

export async function getCertificatesByStudent(studentId: string): Promise<StudentCertificate[]> {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select("id, verification_code, certificate_code, pdf_url, score, issued_at, course:courses!course_id(title)")
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
    certificate_code: c.certificate_code ?? null,
    pdf_url: c.pdf_url,
    score: c.score,
    issued_at: c.issued_at,
  }));
}

// ── getCertificateByCode ─────────────────────────────────────────────────────

export async function getCertificateByCode(code: string): Promise<CertificateVerification | null> {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select(
      "verification_code, certificate_code, pdf_url, score, issued_at, student:profiles!student_id(full_name), course:courses!course_id(title)"
    )
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
    certificate_code: (data as any).certificate_code ?? null,
    pdf_url: data.pdf_url,
  };
}

// ── getIssuedCertificates ────────────────────────────────────────────────────

export async function getIssuedCertificates(): Promise<IssuedCertificate[]> {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select(`
      id, verification_code, certificate_code, pdf_url, score, issued_at,
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
    certificate_code: c.certificate_code ?? null,
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

// ── previewCertificate ───────────────────────────────────────────────────────

export async function previewCertificate(
  templateId: string,
  studentId?: string,
  courseId?: string,
  customInputs?: Record<string, string>
): Promise<{ pdf?: string; message?: string }> {
  const { data: template } = await supabaseAdmin
    .from("certificate_templates")
    .select("id, pdf_url, pdfme_template, custom_fonts")
    .eq("id", templateId)
    .is("deleted_at", null)
    .single();

  if (!template || !template.pdfme_template || Object.keys(template.pdfme_template as any).length === 0) {
    return { message: "La plantilla no tiene diseño guardado." };
  }

  // Student data — real if provided, sample otherwise
  let nombre = "Juan", apellidos = "Pérez García", dni = "12345678";
  if (studentId) {
    const { data: student } = await supabaseAdmin
      .from("profiles")
      .select("full_name, apellidos, dni")
      .eq("id", studentId)
      .single();
    if (student) {
      const ap = student.apellidos ?? "";
      nombre = ap ? (student.full_name ?? "").replace(ap, "").trim() : (student.full_name ?? "");
      apellidos = ap;
      dni = student.dni ?? "";
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const certificateCode = "RC-XXXX-26";
  const verifyUrl = `${baseUrl}/verify/PREVIEW`;

  try {
    const pdfmeTemplate = template.pdfme_template as any;
    const basePdfResponse = await fetch(template.pdf_url);
    const basePdf = new Uint8Array(await basePdfResponse.arrayBuffer());
    const templateForGeneration = { ...pdfmeTemplate, basePdf };

    const autoFields: Record<string, string> = {
      nombre, apellidos, dni, codigo: certificateCode, qr: verifyUrl,
    };

    const extraCustom = customInputs
      ? Object.fromEntries(
          Object.entries(customInputs).filter(
            ([k]) => !["nombre", "apellidos", "dni", "codigo", "qr"].includes(k)
          )
        )
      : {};

    const schemaDefaults: Record<string, string> = {};
    for (const page of (pdfmeTemplate.schemas as any[][]) ?? []) {
      for (const field of page ?? []) {
        if (field?.name && !(field.name in autoFields) && !(field.name in extraCustom) && field.content) {
          schemaDefaults[field.name] = field.content;
        }
      }
    }

    const inputs = [{ ...schemaDefaults, ...extraCustom, ...autoFields }];

    const pdf = await generate({
      template: templateForGeneration,
      inputs,
      plugins: { text, image, ...barcodes },
      options: { font: await getCertificateFonts((template as any).custom_fonts ?? []) },
    });

    return { pdf: Buffer.from(pdf).toString("base64") };
  } catch (err) {
    console.error("[previewCertificate]", err);
    return { message: "Error al generar la vista previa." };
  }
}

// ── generateCertificateBatch ─────────────────────────────────────────────────

export type BatchRow = {
  apellidos: string;
  nombre:    string;
  dni:       string;
  [key: string]: string | undefined;
};

export type BatchResult = {
  row:     number;
  dni:     string;
  nombre:  string;
  success: boolean;
  message?: string;
  pdfUrl?:  string;
};

export async function generateCertificateBatch(
  templateId: string,
  courseId:   string,
  rows:       BatchRow[]
): Promise<BatchResult[]> {
  const role = await getActionRole();
  if (!role || role === "alumno") return [];

  const results: BatchResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Look up student by DNI
    const { data: student } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("dni", row.dni)
      .eq("role", "alumno")
      .maybeSingle();

    if (!student) {
      results.push({ row: i + 1, dni: row.dni, nombre: `${row.apellidos} ${row.nombre}`, success: false, message: "Alumno no encontrado por DNI." });
      continue;
    }

    // Check for existing certificate
    const { data: existing } = await supabaseAdmin
      .from("certificates")
      .select("id")
      .eq("student_id", student.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existing) {
      results.push({ row: i + 1, dni: row.dni, nombre: `${row.apellidos} ${row.nombre}`, success: false, message: "Ya tiene un certificado para este curso." });
      continue;
    }

    const { apellidos, nombre, dni, ...customFields } = row;
    const customInputs: Record<string, string> = {};
    for (const [k, v] of Object.entries(customFields)) {
      if (v) customInputs[k] = v;
    }

    const res = await generateCertificate(
      student.id, courseId, null, templateId,
      Object.keys(customInputs).length > 0 ? customInputs : undefined
    );

    if (res.certificateId) {
      results.push({ row: i + 1, dni, nombre: `${apellidos} ${nombre}`, success: true, pdfUrl: res.pdfUrl ?? undefined });
    } else {
      results.push({ row: i + 1, dni, nombre: `${apellidos} ${nombre}`, success: false, message: res.message });
    }
  }

  return results;
}

// ── generateCertificateExternal ──────────────────────────────────────────────
// Issues a certificate for a person who may not be registered yet.
// If no profile with that DNI exists, creates a silent auth user (no email sent)
// with status "inactivo" so they can be activated and log in later.
// The certificate IS saved to the DB and has a valid QR/verification code.

export type ExternalCertificateInput = {
  templateId: string;
  courseId:   string;
  nombre:     string;
  apellidos:  string;
  dni:        string;
  email:      string;
  [key: string]: string | undefined;
};

export async function generateCertificateExternal(
  input: ExternalCertificateInput
): Promise<{ certificateId?: string; pdfUrl?: string; studentCreated?: boolean; message?: string }> {
  const role = await getActionRole();
  if (!role || role === "alumno") return { message: "Sin permisos." };

  // 1. Find or create student by DNI ─────────────────────────────────────────
  let studentId: string;
  let studentCreated = false;

  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("dni", input.dni.trim())
    .maybeSingle();

  if (existingProfile) {
    studentId = existingProfile.id;
  } else {
    const email = input.email!.trim();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,                 // mark as confirmed — no verification email sent
      password: crypto.randomUUID(),       // random password; user resets via "forgot password" if needed
      user_metadata: { full_name: `${input.apellidos} ${input.nombre}`.trim() },
    });

    if (authError || !authData.user) {
      console.error("[generateCertificateExternal] createUser:", authError?.message);
      return { message: "No se pudo crear el usuario." };
    }

    studentId = authData.user.id;
    studentCreated = true;

    // The Supabase trigger creates the profile row; update with full details
    const fullName = `${input.apellidos} ${input.nombre}`.trim();
    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        apellidos: input.apellidos.trim(),
        dni:       input.dni.trim(),
        role:      "alumno",
        status:    "inactivo",
      })
      .eq("id", studentId);
  }

  // 2. Build customInputs (exclude action-level fields) ───────────────────────
  const reservedKeys = new Set(["templateId","courseId","nombre","apellidos","dni","email"]);
  const customInputs: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (!reservedKeys.has(k) && v) customInputs[k] = v;
  }

  // 3. Generate certificate normally (saves to DB, uploads PDF) ──────────────
  const result = await generateCertificate(
    studentId,
    input.courseId,
    null,
    input.templateId,
    Object.keys(customInputs).length > 0 ? customInputs : undefined
  );

  if (!result.certificateId) {
    return { message: result.message ?? "No se pudo emitir el certificado." };
  }

  return { certificateId: result.certificateId, pdfUrl: result.pdfUrl, studentCreated };
}

// ── deleteCertificate ────────────────────────────────────────────────────────

export async function deleteCertificate(
  id: string
): Promise<{ success?: boolean; message?: string }> {
  const role = await getActionRole();
  if (!role || role === "alumno") return { message: "Sin permisos." };

  const { error } = await supabaseAdmin
    .from("certificates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteCertificate]", error.message);
    return { message: "No se pudo eliminar el certificado." };
  }

  revalidatePath("/dashboard/certificates");
  return { success: true };
}

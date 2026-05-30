"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { generate } from "@pdfme/generator";
import { text, image, barcodes } from "@pdfme/schemas";
import { getCertificateFonts } from "@/lib/certificate-fonts";
import { getActionRole } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { sendCertificateEmail } from "@/lib/email";

// ── Types ─────────────────────────────────────────────────────────────────────

export type IssuedCertificate = {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string | null;
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
  // Check for duplicate certificate
  const { data: duplicate } = await supabaseAdmin
    .from("certificates")
    .select("id")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (duplicate) {
    return { message: "Este alumno ya tiene un certificado para este curso." };
  }

  // Get course with certificate config
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("title, certificate_template_id, certificate_custom_inputs, teacher:profiles!teacher_id(full_name, apellidos, dni)")
    .eq("id", courseId)
    .single();

  if (!course) {
    return { message: "No se encontró el curso." };
  }

  // Resolve template: explicit > course config > first available
  const resolvedTemplateId = templateId ?? (course as any).certificate_template_id ?? null;
  const courseCustomInputs = (course as any).certificate_custom_inputs as Record<string, string> | null;
  const teacher = (course as any).teacher as { full_name: string; apellidos: string | null; dni: string } | null;

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

  // Resolve token-based fields from course config
  const fechaEmision = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());
  const tokenMap: Record<string, string> = {
    __fecha__:               fechaEmision,
    __curso__:               (course as any).title ?? "",
    "__docente.nombre__":    teacher?.full_name ?? "",
    "__docente.apellidos__": teacher?.apellidos ?? "",
    "__docente.dni__":       teacher?.dni ?? "",
    __nombre__:              nombre,
    __apellidos__:           apellidos,
    __dni__:                 dni,
  };
  function resolveTokens(inputs: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(inputs).map(([k, v]) => [k, tokenMap[v] ?? v])
    );
  }
  const resolvedCourseInputs = courseCustomInputs ? resolveTokens(courseCustomInputs) : {};
  const resolvedCustomInputs = customInputs
    ? { ...resolvedCourseInputs, ...customInputs }
    : resolvedCourseInputs;

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
  const verifyUrl = `${baseUrl}/verify/${certificateCode}`;

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

      const extraCustom = resolvedCustomInputs
        ? Object.fromEntries(
            Object.entries(resolvedCustomInputs).filter(
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
    .eq("certificate_code", code)
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

const CERTS_PAGE_SIZE = 5;

async function buildEmailMap(studentIds: string[]): Promise<Map<string, string | null>> {
  const emailMap = new Map<string, string | null>();
  if (studentIds.length === 0) return emailMap;
  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of authUsers) {
    if (studentIds.includes(u.id)) emailMap.set(u.id, u.email ?? null);
  }
  return emailMap;
}

function mapCertRow(c: any, emailMap: Map<string, string | null>): IssuedCertificate {
  return {
    id: c.id,
    student_id: c.student_id,
    student_name: c.student?.full_name ?? "",
    student_email: emailMap.get(c.student_id) ?? null,
    course_title: c.course?.title ?? "",
    template_name: c.template?.name ?? null,
    verification_code: c.verification_code,
    certificate_code: c.certificate_code ?? null,
    pdf_url: c.pdf_url,
    score: c.score,
    issued_at: c.issued_at,
  };
}

export async function getIssuedCertificates(
  page = 1,
  search = ""
): Promise<{ data: IssuedCertificate[]; total: number }> {
  const from = (page - 1) * CERTS_PAGE_SIZE;
  const to   = from + CERTS_PAGE_SIZE - 1;

  let query = supabaseAdmin
    .from("certificates")
    .select(`
      id, student_id, verification_code, certificate_code, pdf_url, score, issued_at,
      student:profiles!student_id(full_name),
      course:courses!course_id(title),
      template:certificate_templates!template_id(name)
    `, { count: "exact" })
    .order("issued_at", { ascending: false });

  if (search.trim()) {
    const term = search.trim();
    // Search by certificate_code OR by matching student profiles
    const { data: matchingProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("full_name", `%${term}%`);

    const profileIds = matchingProfiles?.map((p) => p.id) ?? [];
    const idList = profileIds.length > 0 ? profileIds.join(",") : "00000000-0000-0000-0000-000000000000";

    query = query.or(`certificate_code.ilike.%${term}%,student_id.in.(${idList})`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error || !data) {
    console.error("[getIssuedCertificates]", error?.message);
    return { data: [], total: 0 };
  }

  const emailMap = await buildEmailMap(data.map((c: any) => c.student_id).filter(Boolean));

  return {
    data: data.map((c: any) => mapCertRow(c, emailMap)),
    total: count ?? 0,
  };
}

export async function getAllIssuedCertificatesForExport(): Promise<IssuedCertificate[]> {
  const role = await getActionRole();
  if (!role || role === "alumno") return [];

  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select(`
      id, student_id, verification_code, certificate_code, pdf_url, score, issued_at,
      student:profiles!student_id(full_name),
      course:courses!course_id(title),
      template:certificate_templates!template_id(name)
    `)
    .order("issued_at", { ascending: false });

  if (error || !data) return [];

  const emailMap = await buildEmailMap(data.map((c: any) => c.student_id).filter(Boolean));
  return data.map((c: any) => mapCertRow(c, emailMap));
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
  email?:    string;
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

  // Pre-load all auth users once to avoid repeated listUsers calls
  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const fullName = `${row.apellidos} ${row.nombre}`.trim();

    // 1. Find student by DNI
    const { data: profileRows } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("dni", row.dni.trim());

    let studentId: string | null = profileRows?.[0]?.id ?? null;
    let studentCreated = false;
    let tempPassword: string | undefined;

    // 2. If not found, create user (requires email)
    if (!studentId) {
      if (!row.email?.trim()) {
        results.push({ row: i + 1, dni: row.dni, nombre: fullName, success: false, message: "No encontrado por DNI y sin email para crear cuenta." });
        continue;
      }

      const email = row.email.trim();
      const existingAuthUser = authUsers.find((u) => u.email === email);

      if (existingAuthUser) {
        studentId = existingAuthUser.id;
      } else {
        tempPassword = crypto.randomUUID();
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          password: tempPassword,
          user_metadata: {
            full_name: fullName,
            nombre:    row.nombre.trim(),
            apellidos: row.apellidos.trim(),
            dni:       row.dni.trim(),
            role:      "alumno",
          },
        });

        if (authError || !authData.user) {
          results.push({ row: i + 1, dni: row.dni, nombre: fullName, success: false, message: `Error al crear usuario: ${authError?.message}` });
          continue;
        }

        studentId = authData.user.id;
        studentCreated = true;

        await supabaseAdmin
          .from("profiles")
          .update({ full_name: fullName, apellidos: row.apellidos.trim(), dni: row.dni.trim(), role: "alumno", status: "inactivo" })
          .eq("id", studentId);
      }
    }

    // 3. Check for existing certificate
    const { data: existing } = await supabaseAdmin
      .from("certificates")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existing) {
      results.push({ row: i + 1, dni: row.dni, nombre: fullName, success: false, message: "Ya tiene un certificado para este curso." });
      continue;
    }

    // 4. Generate certificate
    const { apellidos, nombre, dni, email, ...rest } = row;
    const customInputs: Record<string, string> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v) customInputs[k] = v;
    }

    const res = await generateCertificate(
      studentId, courseId, null, templateId,
      Object.keys(customInputs).length > 0 ? customInputs : undefined
    );

    if (!res.certificateId) {
      results.push({ row: i + 1, dni, nombre: fullName, success: false, message: res.message });
      continue;
    }

    // 5. Send email if email available
    if (row.email?.trim()) {
      try {
        const { data: certRow } = await supabaseAdmin
          .from("certificates")
          .select("course:courses!course_id(title)")
          .eq("id", res.certificateId)
          .single();

        await sendCertificateEmail({
          to:           row.email.trim(),
          full_name:    fullName,
          course_title: (certRow?.course as any)?.title ?? "",
          password:     studentCreated ? tempPassword : undefined,
          isNewUser:    studentCreated,
          pdfUrl:       res.pdfUrl,
        });
      } catch {
        // Email falla silenciosamente, certificado ya fue emitido
      }
    }

    results.push({ row: i + 1, dni, nombre: fullName, success: true, pdfUrl: res.pdfUrl ?? undefined });
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
  let tempPassword: string | undefined;

  const { data: profileRows } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("dni", input.dni.trim());

  const existingProfile = profileRows?.[0] ?? null;

  if (existingProfile) {
    studentId = existingProfile.id;
  } else {
    const email = input.email!.trim();

    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existingAuthUser = authUsers.find((u) => u.email === email);

    if (existingAuthUser) {
      studentId = existingAuthUser.id;
      console.log("[external] reusing auth user by email:", studentId);
    } else {
      const fullNameForCreate = `${input.apellidos} ${input.nombre}`.trim();
      tempPassword = crypto.randomUUID();

      console.log("[external] createUser payload:", {
        email,
        email_confirm: true,
        user_metadata: {
          full_name: fullNameForCreate,
          nombre:    input.nombre.trim(),
          apellidos: input.apellidos.trim(),
          dni:       input.dni.trim(),
          role:      "alumno",
        },
      });

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: tempPassword,
        user_metadata: {
          full_name: fullNameForCreate,
          nombre:    input.nombre.trim(),
          apellidos: input.apellidos.trim(),
          dni:       input.dni.trim(),
          role:      "alumno",
        },
      });

      console.log("[external] createUser response — id:", authData?.user?.id, "error code:", authError?.code, "status:", authError?.status, "msg:", authError?.message);

      if (authError || !authData.user) {
        console.error("[generateCertificateExternal] createUser:", authError?.message);
        return { message: "No se pudo crear el usuario. Verifica que el correo sea válido." };
      }

      studentId = authData.user.id;
      studentCreated = true;
    }

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

  // 4. Send email with certificate PDF ────────────────────────────────────────
  try {
    const { data: certRow } = await supabaseAdmin
      .from("certificates")
      .select("course:courses!course_id(title)")
      .eq("id", result.certificateId)
      .single();

    await sendCertificateEmail({
      to:           input.email.trim(),
      full_name:    `${input.apellidos} ${input.nombre}`.trim(),
      course_title: (certRow?.course as any)?.title ?? "",
      password:     studentCreated ? tempPassword : undefined,
      isNewUser:    studentCreated,
      pdfUrl:       result.pdfUrl,
    });
  } catch (emailErr) {
    console.error("[generateCertificateExternal] email:", emailErr);
    // El certificado ya fue emitido, el fallo de email no lo revierte
  }

  return { certificateId: result.certificateId, pdfUrl: result.pdfUrl, studentCreated };
}

// ── resendCertificateEmail ───────────────────────────────────────────────────

export async function resendCertificateEmail(
  id: string
): Promise<{ success?: boolean; message?: string }> {
  const role = await getActionRole();
  if (!role || role === "alumno") return { message: "Sin permisos." };

  const { data: cert, error } = await supabaseAdmin
    .from("certificates")
    .select(`
      student_id, certificate_code, pdf_url,
      student:profiles!student_id(full_name),
      course:courses!course_id(title)
    `)
    .eq("id", id)
    .single();

  if (error || !cert) return { message: "Certificado no encontrado." };

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(cert.student_id);
  const email = authUser?.user?.email;
  if (!email) return { message: "El alumno no tiene correo registrado." };

  try {
    await sendCertificateEmail({
      to:           email,
      full_name:    (cert.student as any)?.full_name ?? "",
      course_title: (cert.course as any)?.title ?? "",
      isNewUser:    false,
      pdfUrl:       cert.pdf_url,
    });
    return { success: true };
  } catch (err) {
    console.error("[resendCertificateEmail]", err);
    return { message: "Error al enviar el correo." };
  }
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

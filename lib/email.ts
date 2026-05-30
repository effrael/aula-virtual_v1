import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendPasswordResetEmail({
  to,
  full_name,
  link,
}: {
  to: string;
  full_name: string;
  link: string;
}) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Recupera el acceso a tu cuenta",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #111;">
        <h2 style="margin-bottom: 4px;">Hola, ${full_name}</h2>
        <p style="color: #555; margin-top: 0;">
          Recibiste este correo porque se solicitó un cambio de contraseña para tu cuenta en la plataforma educativa.
        </p>
        <p style="color: #555;">
          Haz clic en el botón de abajo para establecer tu nueva contraseña. El link expira en <strong>24 horas</strong>.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${link}"
            style="background-color: #ea1e2e; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">
            Restablecer contraseña
          </a>
        </div>

        <p style="color: #aaa; font-size: 13px;">
          Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">Este es un mensaje automático, no respondas a este correo.</p>
      </div>
    `,
  });
}

export async function sendCertificateEmail({
  to,
  full_name,
  course_title,
  certificate_code,
  password,
  isNewUser,
  pdfUrl,
}: {
  to: string;
  full_name: string;
  course_title: string;
  password?: string;
  isNewUser: boolean;
  pdfUrl?: string | null;
}) {
  const attachments: nodemailer.SendMailOptions["attachments"] = [];

  if (pdfUrl) {
    try {
      const res = await fetch(pdfUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      attachments.push({
        filename: `certificado-${full_name.replace(/\s+/g, "-")}.pdf`,
        content: buffer,
        contentType: "application/pdf",
      });
    } catch {
      // Si falla la descarga del PDF, igual enviamos el correo sin adjunto
    }
  }

  const credentialsHtml = isNewUser && password ? `
    <p style="color: #555; margin-top: 16px;">Tu cuenta ha sido creada en el aula virtual. Aquí están tus credenciales de acceso:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f9f9f9; border-radius: 8px;">
      <tr>
        <td style="padding: 10px 16px; font-weight: bold; width: 140px;">Correo</td>
        <td style="padding: 10px 16px;">${to}</td>
      </tr>
      <tr style="background: #f0f0f0;">
        <td style="padding: 10px 16px; font-weight: bold;">Contraseña</td>
        <td style="padding: 10px 16px; font-family: monospace; letter-spacing: 1px;">${password}</td>
      </tr>
    </table>
    <p style="color: #555; font-size: 13px;">Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_URL_APP}"
        style="background-color: #ea1e2e; color: #fff; padding: 10px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">
        Ingresa al aula virtual
      </a>
    </div>
  ` : "";

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Tu certificado — ${course_title}`,
    attachments,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #111;">
        <h2 style="margin-bottom: 4px;">¡Felicitaciones, ${full_name}!</h2>
        <p style="color: #555; margin-top: 0;">
          Se ha emitido tu certificado por el curso <strong>${course_title}</strong>.
          Encuéntralo adjunto en este correo.
        </p>
        ${credentialsHtml}
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">Este es un mensaje automático, no respondas a este correo.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail({
  to,
  full_name,
  password,
  role,
}: {
  to: string;
  full_name: string;
  password: string;
  role: string;
}) {
  const roleLabel: Record<string, string> = {
    alumno: "Alumno",
    docente: "Docente",
    colaborador: "Colaborador",
  };

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Bienvenido/a a la plataforma",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #111;">
        <h2 style="margin-bottom: 4px;">¡Bienvenido/a, ${full_name}!</h2>
        <p style="color: #555; margin-top: 0;">Tu cuenta ha sido creada en la plataforma educativa.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background: #f9f9f9; border-radius: 8px;">
          <tr>
            <td style="padding: 10px 16px; font-weight: bold; width: 140px;">Correo</td>
            <td style="padding: 10px 16px;">${to}</td>
          </tr>
          <tr style="background: #f0f0f0;">
            <td style="padding: 10px 16px; font-weight: bold;">Contraseña</td>
            <td style="padding: 10px 16px; font-family: monospace; letter-spacing: 1px;">${password}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; font-weight: bold;">Rol</td>
            <td style="padding: 10px 16px;">${roleLabel[role] ?? role}</td>
          </tr>
        </table>

        <p style="color: #555; font-size: 13px;">
          Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión por primera vez.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${process.env.NEXT_PUBLIC_URL_APP}"
            style="background-color: #ea1e2e; color: #fff; padding: 8px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">
            Ingresa a tu aula virtual
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">Este es un mensaje automático, no respondas a este correo.</p>
      </div>
    `,
  });
}

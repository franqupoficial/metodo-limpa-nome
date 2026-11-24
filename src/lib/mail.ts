import "server-only";
import nodemailer from "nodemailer";

const configured = () => Boolean(process.env.SMTP_HOST);

let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

/**
 * Envia e-mail transacional. NUNCA inclua dados sensíveis (CPF, documentos, dados de cartão) no conteúdo.
 * Sem SMTP configurado, o e-mail é registrado no console (apenas para desenvolvimento).
 */
export async function sendMail(to: string, subject: string, text: string) {
  if (!configured()) {
    console.info(`[mail:dev] Para: ${to}\nAssunto: ${subject}\n${text}\n`);
    return;
  }
  await getTransporter().sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}

export const appUrl = () => (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000").replace(/\/$/, "");

import "server-only";
import { prisma } from "./db";
import { getSettings } from "./settings";
import { sendMail, appUrl } from "./mail";

/** Notificação no painel (sino) e, conforme configuração, por e-mail à equipe. */
export async function notify(module: "orders" | "stock" | "reviews" | "ai" | "system", title: string, body?: string, link?: string) {
  await prisma.adminNotification.create({ data: { module, title, body, link } });
  const s = (await getSettings()).notifications;
  const to = module === "orders" && s.notifyNewOrder ? s.orderEmails : module === "stock" && s.notifyLowStock ? s.lowStockEmails : module === "reviews" && s.notifyNewReview ? s.orderEmails : [];
  for (const email of to) {
    await sendMail({ to: email, template: `admin.${module}`, subject: `[Luxer] ${title}`, title, paragraphs: body ? [body] : [], cta: link ? { label: "Abrir no painel", url: appUrl() + link } : undefined });
  }
}

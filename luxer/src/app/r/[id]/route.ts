import { prisma } from "@/lib/db";
import type { FlowConfig } from "@/lib/remarketing";

/** Link rastreado dos e-mails de remarketing: registra o clique e leva ao destino com UTM. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const send = await prisma.automationSend.findUnique({ where: { id }, include: { flow: true } });
  const origin = new URL(req.url).origin;
  if (!send) return Response.redirect(new URL("/", origin), 302);
  if (!send.clickedAt) await prisma.automationSend.update({ where: { id }, data: { clickedAt: new Date() } });
  const c = send.flow.config as FlowConfig;
  const to = c.ctaUrl?.startsWith("/") ? c.ctaUrl : "/";
  const u = new URL(to, origin);
  u.searchParams.set("utm_source", "email");
  u.searchParams.set("utm_medium", "remarketing");
  u.searchParams.set("utm_campaign", send.flow.trigger.toLowerCase());
  return Response.redirect(u, 302);
}

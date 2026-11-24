import { z } from "zod";
import { prisma } from "@/lib/db";
import { guardPublic } from "@/lib/http";
import { getSettings } from "@/lib/settings";
import { randomToken } from "@/lib/crypto";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(160), name: z.string().trim().max(80).optional().nullable(), consent: z.literal(true), source: z.string().max(60) });

export async function POST(req: Request) {
  const blocked = await guardPublic(req, "newsletter", 8, 3600);
  if (blocked) return blocked;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ ok: false, error: "Informe um e-mail válido e aceite o consentimento." }, { status: 400 });
  const s = await getSettings();
  await prisma.lead.upsert({
    where: { email: p.data.email },
    create: { email: p.data.email, name: p.data.name || null, source: p.data.source, consentAt: new Date(), consentText: s.marketing.newsletterConsentText, unsubToken: randomToken(16) },
    update: { unsubscribedAt: null, consentAt: new Date(), consentText: s.marketing.newsletterConsentText, source: p.data.source },
  });
  if (p.data.source.startsWith("popup:")) await prisma.popup.updateMany({ where: { id: p.data.source.slice(6) }, data: { conversions: { increment: 1 } } });
  return Response.json({ ok: true });
}

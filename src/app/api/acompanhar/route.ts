import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { trackSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, sameOrigin } from "@/lib/request-meta";
import { hashAccessCode } from "@/lib/requests";
import { safeEqual } from "@/lib/crypto";
import { statusDef } from "@/lib/status";
import { serviceMeta } from "@/lib/services";
import { pixView } from "@/lib/charges";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const ip = await clientIp();
  if (!(await rateLimit(`track:${ip}`, 10, 900)))
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });

  const parsed = trackSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Protocolo ou código de acesso inválido." }, { status: 400 });
  const { protocol, accessCode } = parsed.data;

  const r = await prisma.serviceRequest.findUnique({
    where: { protocol },
    select: { id: true, protocol: true, service: true, status: true, createdAt: true, updatedAt: true, accessCodeHash: true, anonymizedAt: true, summary: true,
      history: { orderBy: { createdAt: "asc" }, select: { toStatus: true, createdAt: true, publicNote: true } } },
  });
  // Mensagem genérica: não revela se o protocolo existe
  if (!r || !safeEqual(r.accessCodeHash, hashAccessCode(protocol, accessCode)))
    return NextResponse.json({ error: "Não encontramos uma solicitação com esses dados. Confira o protocolo e o código de acesso." }, { status: 404 });

  const st = statusDef(r.status);
  const pending = await prisma.payment.findMany({ where: { requestId: r.id, status: "PENDING", method: "PIX", pixPayload: { not: null } }, orderBy: { createdAt: "asc" } });
  const pix = await Promise.all(pending.map((p) => pixView(p)));
  const boletos = await prisma.payment.findMany({ where: { requestId: r.id, status: "PENDING", method: "BOLETO" }, select: { description: true, amountCents: true, dueDate: true } });
  const summary = (r.summary ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    protocol: r.protocol,
    service: serviceMeta(r.service).name,
    status: st.label,
    tone: st.tone,
    nextSteps: st.nextSteps,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    // apenas informações não sensíveis
    info: r.service === "LVB" && summary.vehicle ? `${summary.vehicle} · ${summary.termMonths} meses` : null,
    pix,
    boletos,
    history: r.history.map((h) => ({ status: statusDef(h.toStatus).label, date: h.createdAt, note: h.publicNote })),
  });
}

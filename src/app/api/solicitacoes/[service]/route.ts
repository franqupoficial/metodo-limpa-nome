import { NextResponse } from "next/server";
import type { ServiceType } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { cnpjSchema, consumidorSchema, emprestimoSchema, lvbSchema } from "@/lib/schemas";
import { getSetting } from "@/lib/settings";
import { createServiceRequest } from "@/lib/requests";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, sameOrigin } from "@/lib/request-meta";
import { simulate } from "@/lib/pricing";
import { encryptBuffer, sha256 } from "@/lib/crypto";
import { DOC_MIMES, readUpload, safeFileName } from "@/lib/uploads";
import { createPixCharge, pixView } from "@/lib/charges";

/** Resposta de sucesso: protocolo, código de acesso e, quando houver, a cobrança Pix inicial. */
async function created(r: { id: string; protocol: string; accessCode: string }, charge?: { amountCents: number; description: string; installment?: number }) {
  let pix = null;
  if (charge) {
    try {
      const p = await createPixCharge({ requestId: r.id, protocol: r.protocol, ...charge });
      pix = await pixView(p);
    } catch (e) {
      console.error("Falha ao gerar cobrança Pix", (e as Error).message);
    }
  }
  return NextResponse.json({ protocol: r.protocol, accessCode: r.accessCode, pix }, { status: 201 });
}

const MAP: Record<string, ServiceType> = { consumidor: "CONSUMIDOR", cnpj: "CNPJ", emprestimo: "EMPRESTIMO", lvb: "LVB" };

function fieldErrors(e: ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) {
    const k = i.path.join(".");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

const bad = (error: string, status = 400, extra: object = {}) => NextResponse.json({ error, ...extra }, { status });

export async function POST(req: Request, { params }: { params: Promise<{ service: string }> }) {
  const { service: slug } = await params;
  const service = MAP[slug];
  if (!service) return bad("Serviço inválido.", 404);
  if (!sameOrigin(req)) return bad("Origem não autorizada.", 403);
  if (!(await getSetting("services.enabled"))[service]) return bad("Este serviço está temporariamente indisponível.", 403);

  const ip = await clientIp();
  if (!(await rateLimit(`submit:${ip}`, 10, 3600))) return bad("Muitas solicitações em pouco tempo. Tente novamente mais tarde.", 429);

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 6 * 1024 * 1024) return bad("Envio muito grande.", 413);

  let raw: unknown;
  let cnhFile: File | null = null;
  try {
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const fd = await req.formData();
      raw = JSON.parse(String(fd.get("payload") ?? "{}"));
      const f = fd.get("cnh");
      if (f instanceof File && f.size > 0) cnhFile = f;
    } else {
      raw = await req.json();
    }
  } catch {
    return bad("Dados inválidos.");
  }

  try {
    if (service === "CONSUMIDOR") {
      const data = consumidorSchema.parse(raw);
      const cfg = await getSetting("service.consumidor");
      const { consents, ...details } = data;
      const r = await createServiceRequest({
        service, personal: data.personal, details, consents, ip, amountCents: cfg.pixCents,
        summary: { payment: "PIX", city: `${data.address.city}/${data.address.state}` },
      });
      return created(r, { amountCents: cfg.pixCents, description: "Regularização de apontamentos" });
    }

    if (service === "CNPJ") {
      const data = cnpjSchema.parse(raw);
      const cfg = await getSetting("service.cnpj");
      const { consents, ...details } = data;
      const r = await createServiceRequest({
        service, personal: data.personal, details, consents, ip, amountCents: cfg.priceCents,
        summary: { tradeName: data.business.tradeName, businessType: data.business.businessType, city: `${data.address.city}/${data.address.state}` },
      });
      return created(r, { amountCents: cfg.priceCents, description: "Abertura de CNPJ" });
    }

    if (service === "EMPRESTIMO") {
      const cfg = await getSetting("service.emprestimo");
      const data = emprestimoSchema(cfg.maxCents, cfg.minCents).parse(raw);
      const amountCents = Math.round(data.loan.amount * 100);
      const { consents, ...details } = data;
      const r = await createServiceRequest({
        service, personal: data.personal, details, consents, ip, amountCents,
        summary: { requestedCents: amountCents, dueDay: data.loan.dueDay, paymentMethod: data.loan.paymentMethod, city: `${data.address.city}/${data.address.state}` },
      });
      // Empréstimo: nenhuma cobrança antecipada. As parcelas são cobradas após contrato e liberação.
      return created(r);
    }

    // LVB
    const data = lvbSchema.parse(raw);
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: data.plan.vehicleId, active: true, priceValidatedAt: { not: null }, finalPriceCents: { not: null }, category: { active: true } },
      include: { category: true },
    });
    if (!vehicle || vehicle.availability === "UNAVAILABLE") return bad("Veículo indisponível. Selecione outro veículo.", 400, { fieldErrors: { "plan.vehicleId": "Veículo indisponível." } });
    if (!vehicle.terms.includes(data.plan.termMonths)) return bad("Prazo indisponível para este veículo.", 400, { fieldErrors: { "plan.termMonths": "Prazo indisponível." } });
    const plans = await getSetting("lvb.plans");
    const kmPackage = plans.kmPackages.find((k) => k.id === data.plan.kmPackage) ?? null;
    // preço SEMPRE recalculado no servidor
    const sim = simulate({ baseMonthlyCents: vehicle.finalPriceCents!, termMonths: data.plan.termMonths, termAdjustments: plans.termAdjustments, kmPackage });

    const documents = [];
    if (cnhFile) {
      const up = await readUpload(cnhFile, DOC_MIMES);
      if ("error" in up) return bad(up.error, 400, { fieldErrors: { "license.file": up.error } });
      documents.push({ kind: "CNH", originalName: safeFileName(cnhFile.name), mime: up.mime, buf: up.buf, sha256: sha256(up.buf), dataEnc: encryptBuffer(up.buf) });
    }

    const { consents, ...details } = data;
    const r = await createServiceRequest({
      service, personal: data.personal, consents, ip,
      details: { ...details, pricing: { ...sim, baseMonthlyCents: vehicle.finalPriceCents, kmPackage: kmPackage?.label ?? `${vehicle.kmPerMonth} km/mês` } },
      amountCents: sim.totalCents,
      vehicleId: vehicle.id,
      termMonths: sim.termMonths,
      monthlyCents: sim.monthlyCents,
      documents,
      summary: {
        vehicle: `${vehicle.brand} ${vehicle.name}`,
        category: vehicle.category.name,
        termMonths: sim.termMonths,
        monthlyCents: sim.monthlyCents,
        totalCents: sim.totalCents,
        paymentDay: data.plan.paymentDay,
        recurringMethod: data.plan.recurringMethod,
        km: kmPackage?.label ?? `${vehicle.kmPerMonth} km/mês`,
        city: `${data.address.city}/${data.address.state}`,
      },
    });
    return created(r, { amountCents: sim.monthlyCents, description: `Locação LVB — 1ª parcela de ${sim.termMonths}`, installment: 1 });
  } catch (e) {
    if (e instanceof ZodError) return bad("Revise os campos destacados.", 400, { fieldErrors: fieldErrors(e) });
    console.error("Erro ao registrar solicitação", (e as Error).message);
    return bad("Não foi possível registrar sua solicitação. Tente novamente.", 500);
  }
}

import "server-only";
import { getSettings, type Settings } from "./settings";

/**
 * Frete.
 * - Melhor Envio (https://docs.menv.io): cotação real de Correios e transportadoras, compra de etiqueta e rastreamento.
 *   Variáveis: MELHORENVIO_TOKEN, MELHORENVIO_ENV=sandbox|production, MELHORENVIO_CONTACT_EMAIL (exigido no User-Agent).
 * - Tabela própria: faixas de CEP com preço e prazo definidos pelo administrador (quando não há integração).
 * Nunca há valor de frete inventado: sem integração e sem tabela, o checkout informa que não há opção de entrega.
 */
export type ShippingOption = { id: string; name: string; carrier: string; priceCents: number; days: number; source: "melhorenvio" | "table" | "free" };
export type ShippingItem = { quantity: number; unitCents: number; weightG?: number | null; lengthCm?: number | null; widthCm?: number | null; heightCm?: number | null };

const meBase = () => (process.env.MELHORENVIO_ENV === "production" ? "https://melhorenvio.com.br" : "https://sandbox.melhorenvio.com.br");
export const melhorEnvioConfigured = () => Boolean(process.env.MELHORENVIO_TOKEN);

async function me<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(meBase() + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.MELHORENVIO_TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": `Luxer Joias (${process.env.MELHORENVIO_CONTACT_EMAIL || "contato@luxerjoias.com.br"})`,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as { message?: string })?.message || `Melhor Envio respondeu ${res.status}`);
  return data as T;
}

export const cleanCep = (c: string) => (c || "").replace(/\D/g, "").slice(0, 8);

function packageFor(items: ShippingItem[], s: Settings["shipping"]) {
  const d = s.defaultPackage;
  let weight = 0, length = 0, width = 0, height = 0;
  for (const it of items) {
    weight += (it.weightG || d.weightG) * it.quantity;
    length = Math.max(length, it.lengthCm || d.lengthCm);
    width = Math.max(width, it.widthCm || d.widthCm);
    height += (it.heightCm || d.heightCm) * Math.min(it.quantity, 3);
  }
  return { weightKg: Math.max(0.1, weight / 1000), length: Math.max(16, length), width: Math.max(11, width), height: Math.max(2, Math.min(height, 60)) };
}

type MeQuote = { id: number; name: string; price?: string; custom_price?: string; delivery_time?: number; custom_delivery_time?: number; company?: { name: string }; error?: string };

export async function quoteShipping(postalCodeRaw: string, items: ShippingItem[], subtotalCents: number): Promise<{ options: ShippingOption[]; error?: string }> {
  const settings = await getSettings();
  const s = settings.shipping;
  const to = cleanCep(postalCodeRaw);
  if (to.length !== 8) return { options: [], error: "Informe um CEP válido." };
  const insurance = items.reduce((a, i) => a + i.unitCents * i.quantity, 0);
  let options: ShippingOption[] = [];
  let error: string | undefined;

  if (s.provider === "melhorenvio") {
    if (!melhorEnvioConfigured()) {
      error = "Integração de frete não configurada. Fale conosco para combinar a entrega.";
    } else {
      try {
        const pkg = packageFor(items, s);
        const quotes = await me<MeQuote[]>("POST", "/api/v2/me/shipment/calculate", {
          from: { postal_code: cleanCep(s.originPostalCode) },
          to: { postal_code: to },
          package: { height: pkg.height, width: pkg.width, length: pkg.length, weight: pkg.weightKg },
          options: { insurance_value: s.insuranceEnabled ? insurance / 100 : 0, receipt: false, own_hand: false },
          services: s.allowedServices.length ? s.allowedServices.join(",") : undefined,
        });
        options = quotes
          .filter((q) => !q.error && (q.custom_price || q.price))
          .map((q) => ({
            id: `me:${q.id}`,
            name: q.name,
            carrier: q.company?.name ?? "",
            priceCents: Math.round(Number(q.custom_price || q.price) * 100),
            days: (q.custom_delivery_time ?? q.delivery_time ?? 0) + s.handlingDays,
            source: "melhorenvio" as const,
          }));
        if (!options.length) error = "Nenhuma transportadora atende este CEP para este pacote.";
      } catch (e) {
        console.error("[frete] melhor envio", e);
        error = "Não foi possível calcular o frete agora. Tente novamente em instantes.";
      }
    }
  } else {
    const n = Number(to);
    options = s.table
      .filter((r) => n >= Number(cleanCep(r.fromCep)) && n <= Number(cleanCep(r.toCep)))
      .map((r, i) => ({ id: `table:${i}`, name: r.label, carrier: "Luxer", priceCents: r.priceCents, days: r.days + s.handlingDays, source: "table" as const }));
    if (!options.length) error = "Ainda não temos tabela de entrega para este CEP. Fale conosco pelo WhatsApp.";
  }

  if (options.length && s.freeShippingFromCents != null && subtotalCents >= s.freeShippingFromCents) {
    const cheapest = [...options].sort((a, b) => a.priceCents - b.priceCents)[0];
    options = options.map((o) => (o.id === cheapest.id ? { ...o, priceCents: 0, name: `${o.name} — frete grátis` } : o));
  }
  return { options: options.sort((a, b) => a.priceCents - b.priceCents), error };
}

/** Revalida no servidor a opção escolhida (o preço nunca vem do navegador). */
export async function resolveShipping(postalCode: string, optionId: string, items: ShippingItem[], subtotalCents: number) {
  const { options } = await quoteShipping(postalCode, items, subtotalCents);
  return options.find((o) => o.id === optionId) ?? null;
}

// ─────────── Etiquetas e rastreamento (Melhor Envio) ───────────

export type LabelParty = { name: string; phone: string; email: string; document?: string; companyDocument?: string; address: string; number: string; complement?: string; district: string; city: string; state: string; postalCode: string };

export async function buyLabel(args: {
  serviceId: number;
  from: LabelParty;
  to: LabelParty;
  products: { name: string; quantity: number; unitaryValue: number }[];
  volume: { height: number; width: number; length: number; weightKg: number };
  insuranceValue: number;
  invoiceKey?: string;
}) {
  const party = (p: LabelParty) => ({
    name: p.name, phone: p.phone.replace(/\D/g, ""), email: p.email, document: p.document, company_document: p.companyDocument,
    address: p.address, number: p.number, complement: p.complement, district: p.district, city: p.city, state_abbr: p.state, postal_code: cleanCep(p.postalCode), country_id: "BR",
  });
  const cart = await me<{ id: string }>("POST", "/api/v2/me/cart", {
    service: args.serviceId,
    from: party(args.from),
    to: party(args.to),
    products: args.products.map((p) => ({ name: p.name, quantity: p.quantity, unitary_value: p.unitaryValue })),
    volumes: [{ height: args.volume.height, width: args.volume.width, length: args.volume.length, weight: args.volume.weightKg }],
    options: {
      insurance_value: args.insuranceValue,
      receipt: false,
      own_hand: false,
      invoice: args.invoiceKey ? { key: args.invoiceKey } : undefined,
      non_commercial: !args.invoiceKey,
    },
  });
  await me("POST", "/api/v2/me/shipment/checkout", { orders: [cart.id] });
  await me("POST", "/api/v2/me/shipment/generate", { orders: [cart.id] });
  return cart.id;
}

export async function labelPrintUrl(labelId: string) {
  const r = await me<{ url: string }>("POST", "/api/v2/me/shipment/print", { mode: "private", orders: [labelId] });
  return r.url;
}

export async function trackLabel(labelId: string): Promise<{ status: string; tracking: string | null; url: string | null } | null> {
  const r = await me<Record<string, { status: string; tracking: string | null; melhorenvio_tracking?: string }>>("POST", "/api/v2/me/shipment/tracking", { orders: [labelId] });
  const t = r[labelId];
  if (!t) return null;
  return { status: t.status, tracking: t.tracking, url: t.melhorenvio_tracking ? `https://www.melhorrastreio.com.br/rastreio/${t.melhorenvio_tracking}` : null };
}

export const correiosTrackingUrl = (code: string) => `https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(code)}`;

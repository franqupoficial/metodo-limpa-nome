import "server-only";
import { cache } from "react";
import { prisma } from "./db";

/** Configurações editáveis no painel. Valores padrão = dados públicos do site atual da Luxer. */
export const DEFAULT_SETTINGS = {
  store: {
    name: "Luxer Joias",
    legalName: "Luxer Joias Ltda - ME",
    cnpj: "17.999.745/0001-09",
    tagline: "Joias em ouro 18 quilates",
    logoKey: null as string | null,
    faviconKey: null as string | null,
    domain: "www.luxerjoias.com.br",
  },
  contact: {
    phone: "(41) 98784-6509",
    whatsapp: "5541987846509",
    email: "atendimento@luxerjoias.com",
    address: "Rua Barão do Rio Branco, 63, sala 1802 — Centro, Curitiba/PR — CEP 80010-180",
    hours: "Segunda a sexta-feira, das 10h às 17h",
  },
  social: { instagram: "", facebook: "", tiktok: "", youtube: "", pinterest: "" },
  theme: { black: "#0b0b0c", gold: "#c9a96e", ivory: "#faf8f4" },
  payment: {
    pixEnabled: true,
    cardEnabled: true,
    /** desconto Pix em pontos-base (700 = 7%) — o site atual pratica 7% */
    pixDiscountBps: 700,
    maxInstallments: 10,
    /** parcelas sem juros; acima disso aplica-se a taxa mensal abaixo */
    interestFreeInstallments: 10,
    monthlyInterestBps: 0,
    minInstallmentCents: 10000,
    pixExpiresMinutes: 60,
    statementDescriptor: "LUXERJOIAS",
  },
  shipping: {
    originPostalCode: "80010180",
    /** "melhorenvio" | "table" — tabela própria quando não há integração */
    provider: "table" as "melhorenvio" | "table",
    freeShippingFromCents: null as number | null,
    /** prazo de produção/separação publicado pela Luxer: 10 dias úteis + transportadora */
    handlingDays: 10,
    /** tabela própria: faixas por prefixo de CEP */
    table: [] as { label: string; fromCep: string; toCep: string; priceCents: number; days: number }[],
    insuranceEnabled: true,
    allowedServices: [] as string[],
    defaultPackage: { weightG: 300, lengthCm: 16, widthCm: 11, heightCm: 6 },
  },
  stock: {
    reservationMinutes: 60,
    lowStockDefault: 1,
    /** venda sem estoque cadastrado (produção sob encomenda) */
    allowBackorder: false,
  },
  seo: {
    title: "Luxer Joias — Joias em Ouro 18k",
    description: "Joias em ouro 18 quilates: alianças, anéis, brincos, correntes, pingentes e pulseiras. Curitiba/PR.",
    ogImageKey: null as string | null,
  },
  analytics: { ga4Id: "", gtmId: "", metaPixelId: "", googleSiteVerification: "" },
  notifications: {
    orderEmails: [] as string[],
    lowStockEmails: [] as string[],
    notifyNewOrder: true,
    notifyLowStock: true,
    notifyNewReview: true,
  },
  fiscal: { regime: "", stateRegistration: "", provider: "", notes: "" },
  policies: { exchangeDays: 7, warrantyText: "" },
  marketing: {
    whatsappButton: true,
    whatsappMessage: "Olá! Vim pelo site da Luxer Joias e gostaria de atendimento.",
    cartRecoveryEnabled: true,
    cartRecoveryDelayHours: 3,
    newsletterConsentText: "Aceito receber novidades e ofertas da Luxer Joias por e-mail. Posso cancelar a qualquer momento.",
    instagramPosts: [] as { imageKey: string; url: string; caption?: string }[],
  },
  ai: {
    tryOnEnabled: false,
    provider: "gemini" as "gemini" | "openai",
    model: "gemini-2.5-flash-image",
    categories: ["colares", "correntes", "pingentes", "brincos", "pulseiras", "aneis"] as string[],
    dailyLimitPerClient: 5,
    dailyGlobalLimit: 300,
    monthlyBudgetCents: 50000,
    costPerRequestCents: 25,
    retainResultsHours: 0,
    disclaimer: "Simulação gerada por inteligência artificial. Cores, proporções e caimento podem variar em relação à peça real.",
    unavailableMessage: "O provador virtual está temporariamente indisponível. Fale conosco pelo WhatsApp para ver a peça em detalhes.",
    consentText: "Autorizo o uso da minha foto exclusivamente para gerar esta simulação. A foto não é armazenada após o processamento.",
  },
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingsGroup = keyof Settings;

function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object" || Array.isArray(over)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    if (!(k in out)) continue;
    const b = out[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) ? merge(b, v) : v;
  }
  return out as T;
}

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await prisma.setting.findMany();
  const s = structuredClone(DEFAULT_SETTINGS) as Settings;
  for (const r of rows) {
    if (r.key in s) (s as Record<string, unknown>)[r.key] = merge((s as Record<string, unknown>)[r.key], r.value);
  }
  return s;
});

export async function saveSettingsGroup<K extends SettingsGroup>(key: K, value: Settings[K]) {
  await prisma.setting.upsert({ where: { key }, create: { key, value: value as object }, update: { value: value as object } });
}

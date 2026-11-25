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
  concierge: {
    enabled: true,
    /** IA responde primeiro; sem ANTHROPIC_API_KEY o chat vai direto para a equipe */
    aiEnabled: true,
    model: "claude-opus-5-5",
    greeting: "Olá! Sou o Concierge Luxer. Posso ajudar a encontrar a joia ideal, tirar dúvidas sobre aro, certificado, pagamento e prazos — ou chamar alguém da nossa equipe.",
    offlineMessage: "Nossa equipe responde de segunda a sexta, das 10h às 17h. Deixe sua mensagem e seu contato: retornamos assim que possível.",
    extraInstructions: "",
    quickAnswers: [
      { title: "Numeração de aro", answer: "Os anéis e alianças da Luxer são oferecidos do aro 13 ao 30, conforme a peça. Se você já usa um anel, meça a circunferência interna em milímetros (ou passe um fio no dedo e meça) e envie para nossa equipe, que confirma o aro ideal antes do envio." },
      { title: "Certificado Amagold", answer: "Todas as joias Luxer acompanham certificado de garantia e nota fiscal. Garantimos o teor do ouro 18 quilates e a pureza das pedras descritas." },
      { title: "Prazos de entrega", answer: "O prazo é de 10 dias úteis de preparo somado ao prazo da transportadora, contado a partir da aprovação do pagamento. Informe seu CEP na página da joia para ver valor e prazo exatos." },
      { title: "Pagamento", answer: "Aceitamos Pix com desconto e cartão de crédito parcelado. O pagamento é processado com segurança pela Pagar.me." },
    ] as { title: string; answer: string }[],
  },
  ai: {
    tryOnEnabled: false,
    provider: "gemini" as const,
    /** modelo de edição generativa (recebe a foto do cliente + fotografias da joia) */
    model: "gemini-2.5-flash-image",
    /** modelo de visão: detecção da região do corpo, perfil técnico da joia e verificação de fidelidade */
    analysisModel: "gemini-2.5-flash",
    categories: ["colares", "correntes", "pingentes", "brincos", "pulseiras", "aneis"] as string[],
    dailyLimitPerClient: 5,
    dailyGlobalLimit: 300,
    monthlyBudgetCents: 50000,
    /** custo estimado por geração de imagem e por análise (centavos) — para controle de orçamento */
    costPerRequestCents: 25,
    analysisCostCents: 1,
    /** nota mínima (0–100) da verificação automática para entregar o resultado */
    fidelityThreshold: 70,
    /** tentativas de geração por simulação quando a verificação reprova */
    maxGenerations: 2,
    /** minutos que a foto e o resultado ficam guardados (criptografados) antes da exclusão automática */
    retentionMinutes: 60,
    disclaimer: "Simulação gerada pela LUXER AI. Proporções, brilho e caimento podem variar em relação à peça real.",
    unavailableMessage: "O provador virtual está temporariamente indisponível. Fale conosco pelo WhatsApp para ver a peça em detalhes.",
    consentText: "Autorizo o uso desta foto exclusivamente para gerar a simulação. Ela é processada pela LUXER AI com o Google Gemini e excluída automaticamente em até 60 minutos — ou antes, quando eu solicitar.",
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
  // textos padrão antigos do provador descreviam um tratamento que mudou (a foto agora fica criptografada durante
  // o processamento): nunca exibir ao cliente uma promessa de privacidade que não corresponde ao sistema
  if (/não é armazenada após o processamento/i.test(s.ai.consentText)) s.ai.consentText = DEFAULT_SETTINGS.ai.consentText;
  if (s.ai.disclaimer === "Simulação gerada por inteligência artificial. Cores, proporções e caimento podem variar em relação à peça real.") s.ai.disclaimer = DEFAULT_SETTINGS.ai.disclaimer;
  return s;
});

export async function saveSettingsGroup<K extends SettingsGroup>(key: K, value: Settings[K]) {
  await prisma.setting.upsert({ where: { key }, create: { key, value: value as object }, update: { value: value as object } });
}

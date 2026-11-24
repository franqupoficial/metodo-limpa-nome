import "server-only";
import { prisma } from "./db";
import type { KmPackage, TermAdjustments } from "./pricing";

export type InclusionStatus = "INCLUDED" | "NOT_INCLUDED" | "TO_CONFIRM";

export interface AdditionalCost {
  label: string;
  description: string;
}

export interface Settings {
  "site.contact": { email: string; phone: string; whatsapp: string; hours: string; companyName: string; cnpj: string; address: string };
  "service.consumidor": { pixCents: number; installmentCents: number; maxInstallments: number; scope: string };
  /** Bloco de "congelamento por 12 meses": só é exibido quando habilitado E com base jurídica/operacional preenchida. */
  "service.consumidor.freeze": { enabled: boolean; title: string; description: string; legalBasis: string };
  "service.cnpj": { priceCents: number };
  "payment.pix": { key: string; receiverName: string; city: string; instructions: string };
  "service.emprestimo": { minCents: number; maxCents: number };
  "lvb.plans": { termAdjustments: TermAdjustments; kmPackages: KmPackage[]; priceNotice: string; deliveryWindow: string };
  "lvb.inclusions": { maintenance: InclusionStatus; ipva: InclusionStatus; insurance: InclusionStatus; assistance: InclusionStatus; notes: string };
  "lvb.costs": AdditionalCost[];
  "privacy.retention": { retentionDays: number };
}

export const DEFAULT_SETTINGS: Settings = {
  "site.contact": {
    email: "atendimento@portalconsumidor.ong.br",
    phone: "",
    whatsapp: "",
    hours: "Segunda a sexta, das 9h às 18h",
    companyName: "Portal Consumidor",
    cnpj: "",
    address: "",
  },
  "service.consumidor": {
    pixCents: 29990,
    installmentCents: 39000,
    maxInstallments: 12,
    scope:
      "Levantamento dos apontamentos no Serasa, SPC e Boa Vista; verificação técnica de cada registro; contestação formal e pedidos de exclusão de registros irregulares junto aos birôs e credores; intermediação de acordos para dívidas reconhecidas; reclamações em Procon e consumidor.gov.br quando cabível; e acompanhamento até a conclusão de cada procedimento.",
  },
  "service.consumidor.freeze": { enabled: false, title: "Congelamento de apontamentos por 12 meses", description: "", legalBasis: "" },
  "service.cnpj": { priceCents: 19900 },
  "payment.pix": {
    key: "58d93626-10e0-4972-bb10-eb116d2a8a22",
    receiverName: "Portal Consumidor",
    city: "BRASIL",
    instructions: "Após o pagamento, a confirmação é feita pela nossa equipe em até 1 dia útil e o status do seu protocolo é atualizado.",
  },
  "service.emprestimo": { minCents: 30000, maxCents: 300000 },
  "lvb.plans": {
    termAdjustments: { "12": 0, "24": 0, "36": 0 },
    kmPackages: [],
    priceNotice:
      "Valor mensal com proteção (seguro), manutenção, assistência 24h e IPVA inclusos. Caução, quilometragem excedente e franquia em caso de sinistro conforme contrato.",
    deliveryWindow: "7 a 15 dias",
  },
  "lvb.inclusions": {
    maintenance: "INCLUDED",
    ipva: "INCLUDED",
    insurance: "INCLUDED",
    assistance: "INCLUDED",
    notes: "Proteção contra colisão, roubo e furto, manutenção preventiva e corretiva, assistência 24h e IPVA/licenciamento já estão no valor mensal.",
  },
  "lvb.costs": [
    { label: "Caução", description: "Pode ser exigida conforme o plano. O valor, quando aplicável, é informado na proposta antes da contratação." },
    { label: "Quilometragem excedente", description: "Quilômetros acima da franquia mensal contratada podem ser cobrados conforme valor previsto em contrato." },
    { label: "Franquia / coparticipação em sinistros", description: "Em caso de sinistro, pode haver participação do locatário conforme as condições de proteção do contrato." },
    { label: "Multas e infrações", description: "Multas de trânsito cometidas durante a locação são de responsabilidade do locatário, conforme legislação e contrato." },
  ],
  "privacy.retention": { retentionDays: 1825 },
};

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  let row: { value: unknown } | null = null;
  try {
    row = await prisma.setting.findUnique({ where: { key } });
  } catch (e) {
    // Banco indisponível (ex.: durante o build): usa os valores padrão
    console.warn(`Configuração "${key}" indisponível, usando padrão:`, (e as Error).message.split("\n")[0]);
    return DEFAULT_SETTINGS[key];
  }
  if (!row) return DEFAULT_SETTINGS[key];
  const def = DEFAULT_SETTINGS[key];
  if (Array.isArray(def)) return row.value as Settings[K];
  return { ...(def as object), ...(row.value as object) } as Settings[K];
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}

export const INCLUSION_LABEL: Record<InclusionStatus, string> = {
  INCLUDED: "Incluído no plano",
  NOT_INCLUDED: "Não incluído",
  TO_CONFIRM: "Confirmado na proposta",
};

import { z } from "zod";
import { isValidCep, isValidCpf, isValidPhone, ageFrom, UFS } from "./validators";
import { onlyDigits, formatMoney } from "./format";

// Mensagens padrão em português
z.setErrorMap((issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) return { message: issue.received === "undefined" ? "Campo obrigatório." : "Valor inválido." };
  if (issue.code === z.ZodIssueCode.invalid_enum_value) return { message: "Selecione uma opção válida." };
  if (issue.code === z.ZodIssueCode.too_small) return { message: "Campo obrigatório." };
  return { message: ctx.defaultError };
});

const text = (min: number, max: number, msg?: string) =>
  z.string().trim().min(min, msg ?? `Informe ao menos ${min} caracteres.`).max(max, `Máximo de ${max} caracteres.`);
const optText = (max: number) => z.string().trim().max(max, `Máximo de ${max} caracteres.`).optional().default("");
const mustAccept = (msg: string) => z.literal(true, { errorMap: () => ({ message: msg }) });
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");

export const personalSchema = z.object({
  fullName: text(5, 120, "Informe seu nome completo.").refine((v) => v.split(/\s+/).length >= 2, "Informe nome e sobrenome."),
  cpf: z.string().transform(onlyDigits).refine(isValidCpf, "CPF inválido."),
  birthDate: isoDate.refine((v) => {
    const a = ageFrom(v);
    return a >= 18 && a <= 110;
  }, "É necessário ter 18 anos ou mais."),
  phone: z.string().transform(onlyDigits).refine(isValidPhone, "Telefone inválido. Informe DDD + número."),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(160),
});

export const addressSchema = z.object({
  cep: z.string().transform(onlyDigits).refine(isValidCep, "CEP inválido."),
  street: text(2, 160, "Informe a rua."),
  number: text(1, 20, "Informe o número."),
  complement: optText(80),
  district: text(2, 100, "Informe o bairro."),
  city: text(2, 100, "Informe a cidade."),
  state: z.enum(UFS, { errorMap: () => ({ message: "Selecione o estado." }) }),
});

const baseConsents = {
  privacy: mustAccept("É necessário aceitar a Política de Privacidade."),
  terms: mustAccept("É necessário aceitar os Termos de Uso."),
  truthful: mustAccept("Confirme que as informações são verdadeiras."),
  marketing: z.boolean().optional().default(false),
};

/* ---------------- Consumidor ---------------- */
export const consumidorSchema = z.object({
  personal: personalSchema,
  address: addressSchema,
  records: z.object({
    description: text(10, 3000, "Descreva brevemente os registros (mínimo de 10 caracteres)."),
    creditors: optText(500),
    alreadyContested: z.enum(["SIM", "NAO", "NAO_SEI"]),
  }),
  payment: z.object({ preference: z.enum(["PIX", "PARCELADO"]) }),
  consents: z.object({
    ...baseConsents,
    scope: mustAccept("Confirme que compreendeu o escopo do serviço."),
  }),
});

/* ---------------- CNPJ ---------------- */
export const BUSINESS_TYPES = ["MEI", "ME", "EPP", "NAO_SEI"] as const;
export const OPERATION_MODES = [
  "Estabelecimento fixo",
  "Internet",
  "Em local fixo fora de loja",
  "Porta a porta, postos móveis ou ambulantes",
  "Televenda",
  "Correio",
  "Máquinas automáticas",
] as const;

export const cnpjSchema = z.object({
  personal: personalSchema.extend({
    idDocType: z.enum(["", "RG", "CNH", "OUTRO"]).optional().default(""),
    idDocNumber: optText(30),
  }),
  address: addressSchema,
  business: z
    .object({
      tradeName: text(2, 120, "Informe o nome fantasia pretendido."),
      mainActivity: text(3, 200, "Informe a atividade principal."),
      secondaryActivities: optText(600),
      businessType: z.enum(BUSINESS_TYPES),
      operationModes: z.array(z.enum(OPERATION_MODES)).min(1, "Selecione ao menos uma forma de atuação."),
      sameAddress: z.boolean(),
      businessAddress: optText(300),
      initialCapital: z.coerce.number().min(0, "Valor inválido.").max(100_000_000),
    })
    .refine((b) => b.sameAddress || (b.businessAddress && b.businessAddress.length >= 8), {
      message: "Informe o endereço empresarial.",
      path: ["businessAddress"],
    }),
  consents: z.object({
    ...baseConsents,
    privateFee: mustAccept("Confirme que compreendeu que o valor é de serviço privado."),
  }),
});

/* ---------------- Empréstimo ---------------- */
export const DUE_DAYS = [5, 10, 15, 20, 25] as const;
export const emprestimoSchema = (maxCents: number, minCents: number) =>
  z.object({
    personal: personalSchema,
    address: addressSchema,
    loan: z.object({
      amount: z.coerce
        .number()
        .refine((v) => v * 100 >= minCents, `Valor mínimo de ${formatMoney(minCents)}.`)
        .refine((v) => v * 100 <= maxCents, `Valor máximo de ${formatMoney(maxCents)}.`),
      dueDay: z.coerce.number().refine((v) => (DUE_DAYS as readonly number[]).includes(v), "Selecione o dia de vencimento."),
      purpose: optText(300),
      monthlyIncome: z.coerce.number().min(0).max(1_000_000).optional(),
    }),
    consents: z.object({
      ...baseConsents,
      creditAnalysis: mustAccept("Autorize a análise de crédito para continuar."),
      noGuarantee: mustAccept("Confirme que compreendeu que a aprovação não é garantida."),
    }),
  });

/* ---------------- LVB ---------------- */
export const CNH_CATEGORIES = ["B", "AB", "C", "AC", "D", "AD", "E", "AE"] as const;
export const EXPERIENCE = ["NAO_TRABALHO", "MENOS_6M", "6_12M", "1_2A", "MAIS_2A"] as const;
export const EXPERIENCE_LABEL: Record<(typeof EXPERIENCE)[number], string> = {
  NAO_TRABALHO: "Ainda não trabalho como motorista",
  MENOS_6M: "Menos de 6 meses",
  "6_12M": "De 6 a 12 meses",
  "1_2A": "De 1 a 2 anos",
  MAIS_2A: "Mais de 2 anos",
};
export const PAYMENT_DAYS = [5, 10, 15, 20, 25] as const;

export const lvbSchema = z.object({
  personal: personalSchema,
  address: addressSchema,
  license: z.object({
    cnhNumber: z.string().transform(onlyDigits).refine((v) => v.length === 11, "Número da CNH deve ter 11 dígitos."),
    cnhCategory: z.enum(CNH_CATEGORIES, { errorMap: () => ({ message: "Selecione a categoria." }) }),
    cnhExpiry: isoDate.refine((v) => new Date(v + "T23:59:59") > new Date(), "A CNH informada está vencida."),
    ear: z.enum(["SIM", "NAO"]),
    notes: optText(500),
  }),
  driver: z.object({
    uber: z.boolean(),
    app99: z.boolean(),
    others: z.boolean(),
    othersText: optText(120),
    experience: z.enum(EXPERIENCE),
    mainPlatform: optText(60),
    notes: optText(800),
  }),
  plan: z.object({
    vehicleId: z.string().min(1, "Selecione um veículo."),
    termMonths: z.coerce.number().refine((v) => [12, 24, 36].includes(v), "Selecione o prazo."),
    kmPackage: optText(40),
    paymentDay: z.coerce.number().refine((v) => (PAYMENT_DAYS as readonly number[]).includes(v), "Selecione o dia de pagamento."),
  }),
  consents: z.object({
    ...baseConsents,
    analysis: mustAccept("Autorize a análise cadastral para continuar."),
    conditions: mustAccept("Confirme que compreendeu as condições do plano."),
  }),
});

export type ConsumidorInput = z.infer<typeof consumidorSchema>;
export type CnpjInput = z.infer<typeof cnpjSchema>;
export type EmprestimoInput = z.infer<ReturnType<typeof emprestimoSchema>>;
export type LvbInput = z.infer<typeof lvbSchema>;

export const trackSchema = z.object({
  protocol: z.string().trim().toUpperCase().regex(/^PC-[A-Z]{3}-\d{8}-[A-Z0-9]{5}$/, "Protocolo inválido."),
  accessCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8}$/, "Código de acesso inválido."),
});

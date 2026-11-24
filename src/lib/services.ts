import type { ServiceType } from "@prisma/client";

export interface ServiceMeta {
  type: ServiceType;
  code: string; // usado no protocolo
  name: string;
  short: string;
  href: string;
  formHref: string;
  adminHref: string;
  icon: "shield" | "briefcase" | "wallet" | "car";
  description: string;
  keywords: string[];
}

export const SERVICES: ServiceMeta[] = [
  {
    type: "CONSUMIDOR",
    code: "CON",
    name: "Regularização de apontamentos",
    short: "Consumidor",
    href: "/consumidor",
    formHref: "/consumidor/solicitar",
    adminHref: "/admin/consumidor",
    icon: "shield",
    description: "Serviço de regularização de apontamentos no Serasa, SPC e Boa Vista: contestação de registros irregulares, acordos com credores e acompanhamento até a conclusão.",
    keywords: ["boa vista", "regularizar", "limpar nome", "cpf", "nome sujo", "apontamento", "negativação", "serasa", "spc", "restrição", "score", "dívida", "contestar", "consumidor"],
  },
  {
    type: "CNPJ",
    code: "CNP",
    name: "Abra seu CNPJ",
    short: "Abra seu CNPJ",
    href: "/cnpj",
    formHref: "/cnpj/solicitar",
    adminHref: "/admin/cnpj",
    icon: "briefcase",
    description: "Assistência completa à abertura e formalização do seu negócio: enquadramento, atividades, registro e orientação até a emissão do CNPJ.",
    keywords: ["cnpj", "mei", "empresa", "formalização", "abrir empresa", "microempreendedor", "negócio", "empreender"],
  },
  {
    type: "EMPRESTIMO",
    code: "EMP",
    name: "Empréstimo para negativados",
    short: "Empréstimo",
    href: "/emprestimo",
    formHref: "/emprestimo/solicitar",
    adminHref: "/admin/emprestimos",
    icon: "wallet",
    description: "Crédito de até R$ 3.000,00 para negativados, com contratação digital, contrato por e-mail e parcelas por Pix ou boleto na data que você escolher.",
    keywords: ["empréstimo", "crédito", "dinheiro", "financiamento", "negativado", "restrição"],
  },
  {
    type: "LVB",
    code: "LVB",
    name: "LVB — Locação de veículos",
    short: "Locação de veículos",
    href: "/lvb",
    formHref: "/lvb/solicitar",
    adminHref: "/admin/lvb",
    icon: "car",
    description: "Alugue seu carro para trabalhar com aplicativos. Planos de 12, 24 ou 36 meses, primeira parcela via Pix e vencimento no dia que você escolher.",
    keywords: ["carro", "locação", "aluguel", "uber", "99", "motorista", "aplicativo", "veículo", "lvb"],
  },
];

export const serviceMeta = (t: ServiceType) => SERVICES.find((s) => s.type === t)!;
export const serviceByCode = (c: string) => SERVICES.find((s) => s.code === c);

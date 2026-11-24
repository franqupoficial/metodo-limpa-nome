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
    name: "Regularização e análise de apontamentos",
    short: "Consumidor",
    href: "/consumidor",
    formHref: "/consumidor/solicitar",
    adminHref: "/admin/consumidor",
    icon: "shield",
    description: "Solicite uma análise administrativa dos registros vinculados ao seu CPF em cadastros de proteção ao crédito.",
    keywords: ["cpf", "nome sujo", "apontamento", "negativação", "serasa", "spc", "restrição", "score", "dívida", "contestar", "consumidor"],
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
    description: "Assistência digital para organizar a formalização do seu negócio, com acompanhamento em cada etapa.",
    keywords: ["cnpj", "mei", "empresa", "formalização", "abrir empresa", "microempreendedor", "negócio", "empreender"],
  },
  {
    type: "EMPRESTIMO",
    code: "EMP",
    name: "Solicitação de empréstimo",
    short: "Empréstimo",
    href: "/emprestimo",
    formHref: "/emprestimo/solicitar",
    adminHref: "/admin/emprestimos",
    icon: "wallet",
    description: "Solicite crédito de até R$ 3.000,00 de forma digital. Sujeito a análise, elegibilidade e aprovação.",
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
    description: "Planos de locação de 12, 24 ou 36 meses para motoristas de aplicativo. Escolha a categoria ideal para sua rotina.",
    keywords: ["carro", "locação", "aluguel", "uber", "99", "motorista", "aplicativo", "veículo", "lvb"],
  },
];

export const serviceMeta = (t: ServiceType) => SERVICES.find((s) => s.type === t)!;
export const serviceByCode = (c: string) => SERVICES.find((s) => s.code === c);

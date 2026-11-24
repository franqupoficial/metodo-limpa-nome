import type { ServiceType } from "@prisma/client";

export type StatusGroup = "PENDENTE" | "EM_ANALISE" | "APROVADA" | "FINALIZADA" | "RECUSADA";

export interface StatusDef {
  key: string;
  label: string;
  group: StatusGroup;
  /** Texto exibido na página pública de acompanhamento */
  nextSteps: string;
  tone: "gray" | "blue" | "amber" | "green" | "red";
}

const S: Record<string, StatusDef> = {
  RECEBIDO: { key: "RECEBIDO", label: "Recebido", group: "PENDENTE", tone: "gray", nextSteps: "Sua solicitação foi registrada. Nossa equipe dará início ao atendimento e entrará em contato pelos canais informados." },
  EM_ANALISE: { key: "EM_ANALISE", label: "Em processamento", group: "EM_ANALISE", tone: "blue", nextSteps: "Sua solicitação está sendo processada pela equipe. Caso precise de algo, entraremos em contato pelos canais informados." },
  AGUARDANDO_DOCUMENTACAO: { key: "AGUARDANDO_DOCUMENTACAO", label: "Aguardando documentação", group: "PENDENTE", tone: "amber", nextSteps: "Precisamos de informações ou documentos adicionais. Verifique seu e-mail e telefone cadastrados." },
  AGUARDANDO_PAGAMENTO: { key: "AGUARDANDO_PAGAMENTO", label: "Aguardando pagamento", group: "PENDENTE", tone: "amber", nextSteps: "As instruções de pagamento serão enviadas pelos canais oficiais do portal. Nunca realize pagamentos solicitados por canais não oficiais." },
  EM_ANDAMENTO: { key: "EM_ANDAMENTO", label: "Em execução", group: "EM_ANALISE", tone: "blue", nextSteps: "O serviço contratado está em execução. Cada procedimento realizado é registrado neste acompanhamento." },
  APROVADO: { key: "APROVADO", label: "Aprovado", group: "APROVADA", tone: "green", nextSteps: "Sua solicitação foi aprovada. As condições serão apresentadas antes de qualquer contratação." },
  AGUARDANDO_CONTRATACAO: { key: "AGUARDANDO_CONTRATACAO", label: "Aguardando contratação", group: "APROVADA", tone: "amber", nextSteps: "As condições foram apresentadas e aguardam sua confirmação para formalização." },
  CONTRATO_ENVIADO: { key: "CONTRATO_ENVIADO", label: "Contrato enviado", group: "APROVADA", tone: "blue", nextSteps: "O contrato foi enviado ao e-mail cadastrado. Leia com atenção antes de assinar." },
  VEICULO_RESERVADO: { key: "VEICULO_RESERVADO", label: "Veículo reservado", group: "APROVADA", tone: "green", nextSteps: "Um veículo foi reservado para você. Aguarde o agendamento da retirada." },
  RETIRADA_AGENDADA: { key: "RETIRADA_AGENDADA", label: "Retirada agendada", group: "APROVADA", tone: "green", nextSteps: "A retirada foi agendada. Compareça na data e local informados com documento de identificação e CNH original." },
  FINALIZADO: { key: "FINALIZADO", label: "Finalizado", group: "FINALIZADA", tone: "green", nextSteps: "Esta solicitação foi concluída." },
  CANCELADO: { key: "CANCELADO", label: "Cancelado", group: "RECUSADA", tone: "red", nextSteps: "Esta solicitação foi cancelada. Em caso de dúvidas, entre em contato." },
  RECUSADO: { key: "RECUSADO", label: "Não aprovado", group: "RECUSADA", tone: "red", nextSteps: "A solicitação não foi aprovada. Entre em contato para conhecer os motivos e as alternativas disponíveis." },
};

const FLOWS: Record<ServiceType, string[]> = {
  CONSUMIDOR: ["RECEBIDO", "EM_ANALISE", "AGUARDANDO_DOCUMENTACAO", "AGUARDANDO_PAGAMENTO", "EM_ANDAMENTO", "FINALIZADO", "CANCELADO", "RECUSADO"],
  CNPJ: ["RECEBIDO", "EM_ANALISE", "AGUARDANDO_DOCUMENTACAO", "AGUARDANDO_PAGAMENTO", "EM_ANDAMENTO", "FINALIZADO", "CANCELADO", "RECUSADO"],
  EMPRESTIMO: ["RECEBIDO", "EM_ANALISE", "AGUARDANDO_DOCUMENTACAO", "APROVADO", "AGUARDANDO_CONTRATACAO", "CONTRATO_ENVIADO", "FINALIZADO", "CANCELADO", "RECUSADO"],
  LVB: [
    "RECEBIDO", "EM_ANALISE", "AGUARDANDO_DOCUMENTACAO", "APROVADO", "AGUARDANDO_CONTRATACAO", "AGUARDANDO_PAGAMENTO",
    "CONTRATO_ENVIADO", "VEICULO_RESERVADO", "RETIRADA_AGENDADA", "FINALIZADO", "CANCELADO", "RECUSADO",
  ],
};

export const statusesFor = (service: ServiceType) => FLOWS[service].map((k) => S[k]);
export const isValidStatus = (service: ServiceType, status: string) => FLOWS[service].includes(status);
export const statusDef = (key: string): StatusDef =>
  S[key] ?? { key, label: key, group: "PENDENTE", tone: "gray", nextSteps: "" };
export const ALL_STATUSES = Object.values(S);

export const GROUP_LABEL: Record<StatusGroup, string> = {
  PENDENTE: "Pendentes",
  EM_ANALISE: "Em processamento",
  APROVADA: "Aprovadas",
  FINALIZADA: "Finalizadas",
  RECUSADA: "Recusadas/canceladas",
};
export const statusesInGroup = (g: StatusGroup) => ALL_STATUSES.filter((s) => s.group === g).map((s) => s.key);

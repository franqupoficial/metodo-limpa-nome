import "server-only";
import type { Prisma, ServiceType } from "@prisma/client";
import { prisma } from "./db";
import { encryptJson, encryptString, keyedHash, randomCode, sha256 } from "./crypto";
import { serviceMeta } from "./services";
import { sendMail, appUrl } from "./mail";

export function generateProtocol(service: ServiceType, now = new Date()): string {
  const d = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `PC-${serviceMeta(service).code}-${d}-${randomCode(5)}`;
}

export const hashAccessCode = (protocol: string, code: string) => keyedHash(`access:${protocol}:${code.toUpperCase()}`);

interface CreateInput {
  service: ServiceType;
  personal: { fullName: string; cpf: string; email: string; phone: string };
  details: unknown;
  summary: Prisma.InputJsonValue;
  consents: Record<string, boolean>;
  amountCents?: number | null;
  vehicleId?: string | null;
  termMonths?: number | null;
  monthlyCents?: number | null;
  ip: string;
  documents?: { kind: string; originalName: string; mime: string; buf: Buffer; dataEnc: Buffer; sha256: string }[];
}

export async function createServiceRequest(input: CreateInput): Promise<{ id: string; protocol: string; accessCode: string }> {
  const cpfHash = keyedHash(`cpf:${input.personal.cpf}`);
  const customer = await prisma.customer.upsert({
    where: { cpfHash },
    create: {
      name: input.personal.fullName,
      cpfEnc: encryptString(input.personal.cpf),
      cpfHash,
      cpfLast2: input.personal.cpf.slice(-2),
      email: input.personal.email,
      phone: input.personal.phone,
    },
    update: { name: input.personal.fullName, email: input.personal.email, phone: input.personal.phone },
  });

  const accessCode = randomCode(8);
  const consentRecord = { ...input.consents, acceptedAt: new Date().toISOString(), policyVersion: "1.0" };

  for (let attempt = 0; attempt < 5; attempt++) {
    const protocol = generateProtocol(input.service);
    try {
      const created = await prisma.serviceRequest.create({
        data: {
          protocol,
          service: input.service,
          customerId: customer.id,
          detailsEnc: encryptJson(input.details),
          summary: input.summary,
          amountCents: input.amountCents ?? null,
          vehicleId: input.vehicleId ?? null,
          termMonths: input.termMonths ?? null,
          monthlyCents: input.monthlyCents ?? null,
          accessCodeHash: hashAccessCode(protocol, accessCode),
          consents: consentRecord,
          ipHash: sha256(input.ip).slice(0, 32),
          history: { create: { toStatus: "RECEBIDO", note: "Solicitação registrada pelo portal." } },
          documents: input.documents?.length
            ? { create: input.documents.map((d) => ({ kind: d.kind, originalName: d.originalName, mime: d.mime, size: d.buf.length, sha256: d.sha256, dataEnc: new Uint8Array(d.dataEnc) })) }
            : undefined,
        },
      });
      // E-mail de confirmação SEM dados sensíveis (somente protocolo)
      sendMail(
        input.personal.email,
        `Solicitação recebida — protocolo ${protocol}`,
        `Olá,\n\nRecebemos sua solicitação de "${serviceMeta(input.service).name}".\n\nProtocolo: ${protocol}\n\nPara acompanhar, acesse ${appUrl()}/acompanhar e informe o protocolo e o código de acesso exibido na tela de confirmação.\n\nAcompanhe cada etapa pelo portal. Nunca solicitamos senhas ou pagamentos por canais não oficiais.\n\nPortal Consumidor`,
      ).catch((e) => console.error("Falha ao enviar e-mail de confirmação", e));
      return { id: created.id, protocol, accessCode };
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") continue; // colisão de protocolo
      throw e;
    }
  }
  throw new Error("Não foi possível gerar o protocolo.");
}

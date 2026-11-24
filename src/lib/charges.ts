import "server-only";
import type { Payment } from "@prisma/client";
import { prisma } from "./db";
import { getSetting } from "./settings";
import { buildPixPayload } from "./pix";
import { pixQrDataUrl } from "./pix-qr";
import { formatDate, formatMoney } from "./format";
import { sendMail, appUrl } from "./mail";

export const PIX_PROVIDER = "PIX_CHAVE";
export const BOLETO_PROVIDER = "BOLETO_MANUAL";

/** Cria uma cobrança Pix (chave aleatória do portal) vinculada à solicitação. */
export async function createPixCharge(opts: { requestId: string; protocol: string; amountCents: number; description: string; installment?: number; dueDate?: Date | null }) {
  const pix = await getSetting("payment.pix");
  const count = await prisma.payment.count({ where: { requestId: opts.requestId } });
  const txid = `${opts.protocol.replace(/[^A-Z0-9]/gi, "").slice(-18)}N${count + 1}`.slice(0, 25);
  const payload = buildPixPayload({ key: pix.key, receiverName: pix.receiverName, city: pix.city, amountCents: opts.amountCents, txid });
  return prisma.payment.create({
    data: {
      requestId: opts.requestId, provider: PIX_PROVIDER, providerChargeId: txid, method: "PIX", status: "PENDING",
      amountCents: opts.amountCents, description: opts.description, installment: opts.installment ?? null,
      dueDate: opts.dueDate ?? null, pixPayload: payload,
    },
  });
}

export async function pixView(p: Pick<Payment, "amountCents" | "pixPayload" | "description" | "dueDate">) {
  const pix = await getSetting("payment.pix");
  return {
    amountCents: p.amountCents,
    description: p.description ?? "",
    dueDate: p.dueDate?.toISOString() ?? null,
    payload: p.pixPayload ?? "",
    qr: p.pixPayload ? await pixQrDataUrl(p.pixPayload) : "",
    receiverName: pix.receiverName,
    key: pix.key,
    instructions: pix.instructions,
  };
}

export type PixView = Awaited<ReturnType<typeof pixView>>;

/** E-mail de cobrança Pix (sem dados pessoais sensíveis). */
export async function emailPixCharge(to: string, protocol: string, p: Payment) {
  const pix = await getSetting("payment.pix");
  await sendMail(
    to,
    `Cobrança Pix — ${p.description ?? "Portal Consumidor"} — protocolo ${protocol}`,
    `Olá,\n\nSegue sua cobrança referente ao protocolo ${protocol}.\n\n${p.description ?? ""}\nValor: ${formatMoney(p.amountCents)}${p.dueDate ? `\nVencimento: ${formatDate(p.dueDate)}` : ""}\nRecebedor: ${pix.receiverName}\n\nPix copia e cola:\n${p.pixPayload}\n\nOu pague com a chave Pix: ${pix.key}\n\nVocê também encontra o QR Code em ${appUrl()}/acompanhar (protocolo + código de acesso).\n\n${pix.instructions}\n\nPortal Consumidor`,
  );
  await prisma.payment.update({ where: { id: p.id }, data: { sentAt: new Date() } });
}

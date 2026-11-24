"use server";
import { prisma } from "@/lib/db";
import { getCustomer } from "@/lib/customer-auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-meta";
import { keyedHash } from "@/lib/crypto";
import { notify } from "@/lib/notifications";
import { REVENUE_STATUSES } from "@/lib/order-status";
import { str, fail, ok, type ActionState } from "@/lib/action";

/** Avaliação: somente clientes identificados; selo "compra verificada" se houver pedido pago com a peça. Moderada antes de publicar. */
export async function submitReview(_: ActionState, fd: FormData): Promise<ActionState> {
  const c = await getCustomer();
  if (!c) return fail("Entre na sua conta para avaliar.");
  if (!(await rateLimit(`review:${c.id}`, 5, 86400))) return fail("Limite diário de avaliações atingido.");
  const productId = str(fd, "productId");
  const rating = Number(str(fd, "rating"));
  const body = str(fd, "body");
  if (!(rating >= 1 && rating <= 5)) return fail("Escolha uma nota de 1 a 5.");
  if (body.length < 10 || body.length > 2000) return fail("Escreva entre 10 e 2000 caracteres.");
  if (await prisma.review.findFirst({ where: { productId, customerId: c.id } })) return fail("Você já avaliou esta peça.");
  const order = await prisma.order.findFirst({ where: { customerId: c.id, status: { in: [...REVENUE_STATUSES, "DELIVERED"] }, items: { some: { productId } } }, select: { id: true } });
  await prisma.review.create({ data: { productId, customerId: c.id, orderId: order?.id, verified: Boolean(order), authorName: c.name.split(" ")[0] + (c.name.split(" ")[1] ? ` ${c.name.split(" ")[1][0]}.` : ""), rating, title: str(fd, "title").slice(0, 120) || null, body } });
  await notify("reviews", "Nova avaliação aguardando moderação", `${rating}★ — ${body.slice(0, 80)}`, "/admin/avaliacoes");
  return ok("Obrigado! Sua avaliação será publicada após a moderação.");
}

export async function reportReview(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`report:${ip}`, 10, 86400))) return fail("Limite de denúncias atingido.");
  const reason = str(fd, "reason").slice(0, 300);
  if (reason.length < 3) return fail("Informe o motivo.");
  await prisma.reviewReport.create({ data: { reviewId: str(fd, "reviewId"), reason, ipHash: keyedHash(ip).slice(0, 24) } });
  return ok("Denúncia enviada. Obrigado.");
}

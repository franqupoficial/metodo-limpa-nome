"use server";
import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { assertAdmin, ForbiddenError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { addEvent, cancelOrder, changeStatus, syncPayment } from "@/lib/orders";
import { buyLabel, labelPrintUrl, trackLabel, melhorEnvioConfigured, cleanCep } from "@/lib/shipping";
import { decryptJson } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";
import { bool, fail, ok, str, type ActionState } from "@/lib/action";

async function run(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ForbiddenError) return fail(e.message);
    console.error(e);
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}

export async function updateOrderStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("orders.update");
    const id = str(fd, "id");
    const to = str(fd, "status") as OrderStatus;
    await changeStatus(id, to, { id: admin.id, name: admin.name }, str(fd, "note") || undefined, { code: str(fd, "trackingCode") || undefined, url: str(fd, "trackingUrl") || undefined, carrier: str(fd, "carrier") || undefined });
    await audit(admin.id, "order.status", "Order", id, { meta: { to } });
    revalidatePath(`/admin/pedidos/${id}`);
    return ok("Status atualizado. O cliente foi notificado quando aplicável.");
  });
}

export async function bulkOrderStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("orders.update");
    const ids = fd.getAll("ids").map(String);
    const to = str(fd, "status") as OrderStatus;
    if (!ids.length) return fail("Selecione pedidos.");
    const errors: string[] = [];
    let n = 0;
    for (const id of ids) {
      try {
        await changeStatus(id, to, { id: admin.id, name: admin.name });
        n++;
      } catch (e) {
        const o = await prisma.order.findUnique({ where: { id }, select: { number: true } });
        errors.push(`#${o?.number}: ${(e as Error).message}`);
      }
    }
    await audit(admin.id, "order.bulk_status", "Order", undefined, { meta: { ids, to, n } });
    revalidatePath("/admin/pedidos");
    return errors.length ? fail(`${n} atualizado(s). ${errors.join(" · ")}`) : ok(`${n} pedido(s) atualizado(s).`);
  });
}

export async function addOrderNote(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("orders.update");
    const id = str(fd, "id");
    const message = str(fd, "message").slice(0, 2000);
    if (!message) return fail("Escreva a observação.");
    const type = str(fd, "type") === "occurrence" ? "occurrence" : "note";
    await addEvent(id, type, message, { id: admin.id, name: admin.name }, { internal: true });
    await audit(admin.id, `order.${type}`, "Order", id);
    revalidatePath(`/admin/pedidos/${id}`);
    return ok(type === "occurrence" ? "Ocorrência registrada." : "Nota interna registrada.");
  });
}

export async function cancelOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const refund = bool(fd, "refund");
    const admin = await assertAdmin(refund ? "orders.refund" : "orders.cancel");
    if (!admin.can("orders.cancel")) return fail("Você não tem permissão para cancelar pedidos.");
    const reason = str(fd, "reason");
    if (reason.length < 3) return fail("Informe o motivo do cancelamento.");
    const id = str(fd, "id");
    await cancelOrder(id, { id: admin.id, name: admin.name }, { reason, refund, restock: bool(fd, "restock") });
    await audit(admin.id, "order.cancel", "Order", id, { meta: { reason, refund } });
    revalidatePath(`/admin/pedidos/${id}`);
    return ok("Pedido cancelado.");
  });
}

export async function syncPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("orders.view");
    const p = await prisma.payment.findUniqueOrThrow({ where: { id: str(fd, "paymentId") } });
    await syncPayment(p.id);
    await audit(admin.id, "payment.sync", "Order", p.orderId);
    revalidatePath(`/admin/pedidos/${p.orderId}`);
    return ok("Pagamento sincronizado com a Pagar.me.");
  });
}

/** Compra e gera a etiqueta no Melhor Envio (debita o saldo da conta Melhor Envio da loja). */
export async function buyLabelAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("orders.update");
    if (!melhorEnvioConfigured()) return fail("Melhor Envio não configurado (MELHORENVIO_TOKEN).");
    const o = await prisma.order.findUniqueOrThrow({ where: { id: str(fd, "id") }, include: { items: true } });
    if (!["PAID", "PICKING", "READY_TO_SHIP"].includes(o.status)) return fail("Gere a etiqueta apenas para pedidos pagos ainda não enviados.");
    if (o.shippingLabelId) return fail("Este pedido já possui etiqueta.");
    if (!o.shippingServiceId?.startsWith("me:")) return fail("O frete deste pedido não foi cotado pelo Melhor Envio.");
    const s = await getSettings();
    const addr = decryptJson<{ recipient: string; postalCode: string; street: string; number: string; complement?: string; district: string; city: string; state: string }>(o.addressEnc!);
    const fromAddr = str(fd, "fromAddress") || s.contact.address;
    const m = fromAddr.match(/^(.*?),\s*(\d+[^,—-]*)/);
    const pkg = s.shipping.defaultPackage;
    const labelId = await buyLabel({
      serviceId: Number(o.shippingServiceId.slice(3)),
      from: { name: s.store.legalName, phone: s.contact.phone, email: s.contact.email, companyDocument: s.store.cnpj.replace(/\D/g, ""), address: m?.[1] ?? fromAddr, number: m?.[2]?.trim() ?? "s/n", district: str(fd, "fromDistrict") || "Centro", city: str(fd, "fromCity") || "Curitiba", state: str(fd, "fromState") || "PR", postalCode: cleanCep(s.shipping.originPostalCode) },
      to: { name: addr.recipient, phone: o.phone ?? "", email: o.email, address: addr.street, number: addr.number, complement: addr.complement, district: addr.district, city: addr.city, state: addr.state, postalCode: addr.postalCode },
      products: o.items.map((i) => ({ name: i.name.slice(0, 60), quantity: i.quantity, unitaryValue: i.unitCents / 100 })),
      volume: { height: pkg.heightCm, width: pkg.widthCm, length: pkg.lengthCm, weightKg: Math.max(0.1, (pkg.weightG * o.items.reduce((a, i) => a + i.quantity, 0)) / 1000) },
      insuranceValue: (o.totalCents - o.shippingCents) / 100,
      invoiceKey: str(fd, "invoiceKey") || undefined,
    });
    await prisma.order.update({ where: { id: o.id }, data: { shippingLabelId: labelId, status: o.status === "PAID" || o.status === "PICKING" ? "READY_TO_SHIP" : o.status } });
    await addEvent(o.id, "shipping", `Etiqueta gerada no Melhor Envio (${labelId}).`, { id: admin.id, name: admin.name });
    await audit(admin.id, "order.label", "Order", o.id, { meta: { labelId } });
    revalidatePath(`/admin/pedidos/${o.id}`);
    return ok("Etiqueta gerada. Use “Imprimir etiqueta”.");
  });
}

export async function printLabelAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await assertAdmin("orders.update");
    const o = await prisma.order.findUniqueOrThrow({ where: { id: str(fd, "id") } });
    if (!o.shippingLabelId) return fail("Pedido sem etiqueta.");
    return ok("Etiqueta pronta.", { redirect: await labelPrintUrl(o.shippingLabelId) });
  });
}

export async function refreshTrackingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("orders.update");
    const o = await prisma.order.findUniqueOrThrow({ where: { id: str(fd, "id") } });
    if (!o.shippingLabelId) return fail("Pedido sem etiqueta do Melhor Envio.");
    const t = await trackLabel(o.shippingLabelId);
    if (!t) return fail("Rastreamento ainda não disponível.");
    await prisma.order.update({ where: { id: o.id }, data: { trackingCode: t.tracking ?? o.trackingCode, trackingUrl: t.url ?? o.trackingUrl } });
    if (t.status === "posted" && ["PAID", "PICKING", "READY_TO_SHIP"].includes(o.status) && (t.tracking || o.trackingCode)) await changeStatus(o.id, "SHIPPED", { id: admin.id, name: admin.name }, "Postagem confirmada pela transportadora.");
    if (t.status === "delivered" && o.status === "SHIPPED") await changeStatus(o.id, "DELIVERED", { id: admin.id, name: admin.name }, "Entrega confirmada pela transportadora.");
    revalidatePath(`/admin/pedidos/${o.id}`);
    return ok(`Status na transportadora: ${t.status}${t.tracking ? ` · ${t.tracking}` : ""}`);
  });
}

import "server-only";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { buildCartView, getCartRow } from "./cart";
import { getSettings } from "./settings";
import { resolveShipping } from "./shipping";
import { reserve, releaseReservation, StockError } from "./stock";
import { encryptJson, encryptString, keyedHash, randomToken } from "./crypto";
import { installmentPlan } from "./pricing";
import { isValidCpf, isValidPhone, onlyDigits, UFS } from "./validators";
import * as pagarme from "./payments/pagarme";
import { applyPaymentUpdate, addEvent } from "./orders";
import { orderMails } from "./mail";
import { getCustomer, startCustomerSession, customerPasswordOk } from "./customer-auth";
import { clientIp } from "./request-meta";

export const checkoutSchema = z.object({
  name: z.string().trim().min(5, "Informe o nome completo.").max(120).refine((v) => v.includes(" "), "Informe nome e sobrenome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(160),
  phone: z.string().refine(isValidPhone, "Telefone inválido."),
  cpf: z.string().refine(isValidCpf, "CPF inválido."),
  postalCode: z.string().transform(onlyDigits).refine((v) => v.length === 8, "CEP inválido."),
  street: z.string().trim().min(2).max(160),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(80).optional().default(""),
  district: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().toUpperCase().refine((v) => UFS.includes(v), "UF inválida."),
  shippingOptionId: z.string().min(1, "Escolha a forma de entrega."),
  paymentMethod: z.enum(["PIX", "CREDIT_CARD"]),
  installments: z.coerce.number().int().min(1).max(24).default(1),
  cardToken: z.string().max(200).optional(),
  createAccount: z.boolean().default(false),
  password: z.string().max(128).optional(),
  marketingOptIn: z.boolean().default(false),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "É necessário aceitar os termos e a política de privacidade." }) }),
  note: z.string().trim().max(500).optional(),
  utmSource: z.string().max(80).optional(),
  utmCampaign: z.string().max(80).optional(),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutResult = { ok: true; token: string } | { ok: false; error: string; field?: string };

export { allocate } from "./allocate";
import { allocate } from "./allocate";

export async function placeOrder(raw: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: String(issue.path[0] ?? "") };
  }
  const d = parsed.data;
  const settings = await getSettings();
  if (!pagarme.pagarmeConfigured()) return { ok: false, error: "Pagamentos online ainda não estão habilitados. Fale conosco pelo WhatsApp para concluir sua compra." };
  if (d.paymentMethod === "PIX" && !settings.payment.pixEnabled) return { ok: false, error: "Pix indisponível no momento." };
  if (d.paymentMethod === "CREDIT_CARD" && !settings.payment.cardEnabled) return { ok: false, error: "Cartão indisponível no momento." };
  if (d.paymentMethod === "CREDIT_CARD" && !d.cardToken) return { ok: false, error: "Não foi possível validar o cartão. Confira os dados e tente novamente." };

  const cartRow = await getCartRow(false);
  const view = await buildCartView(cartRow?.id ?? null);
  if (!cartRow || !view.lines.length) return { ok: false, error: "Seu carrinho está vazio." };
  if (view.hasProblems) return { ok: false, error: "Alguns itens do carrinho mudaram de disponibilidade. Revise o carrinho." };
  if (view.coupon?.error) return { ok: false, error: view.coupon.error, field: "coupon" };

  const shipItems = view.lines.map((l) => ({ quantity: l.quantity, unitCents: l.unitCents, ...l.shipping }));
  const ship = await resolveShipping(d.postalCode, d.shippingOptionId, shipItems, view.subtotalCents);
  if (!ship) return { ok: false, error: "A opção de entrega escolhida não está mais disponível. Calcule o frete novamente.", field: "shippingOptionId" };
  const shippingCents = view.coupon?.freeShipping ? 0 : ship.priceCents;

  const isPix = d.paymentMethod === "PIX";
  const lineTotals = view.lines.map((l) => (isPix ? l.pixUnitCents : l.unitCents) * l.quantity);
  const itemsTotal = lineTotals.reduce((a, b) => a + b, 0);
  const couponDiscount = Math.min(view.discountCents, itemsTotal);
  const goods = itemsTotal - couponDiscount;
  let installments = 1;
  let interest = 0;
  if (!isPix) {
    if (d.installments > view.installments.max) return { ok: false, error: `Parcelamento máximo: ${view.installments.max}x.`, field: "installments" };
    installments = d.installments;
    const plan = installmentPlan(goods + shippingCents, installments, settings.payment);
    interest = plan.interest;
  }
  const total = goods + shippingCents + interest;
  const discountTotal = view.subtotalCents - itemsTotal + couponDiscount;

  // cliente (conta ou visitante)
  const logged = await getCustomer();
  const cpfDigits = onlyDigits(d.cpf);
  const cpfHash = keyedHash(cpfDigits);
  let customer = logged ?? (await prisma.customer.findUnique({ where: { email: d.email } }));
  if (customer && !logged && customer.passwordHash && d.createAccount) return { ok: false, error: "Este e-mail já possui conta. Entre com sua senha para continuar.", field: "email" };
  if (d.createAccount && (!d.password || !customerPasswordOk(d.password))) return { ok: false, error: "Senha deve ter 8 ou mais caracteres, com letras e números.", field: "password" };
  const cpfOwner = await prisma.customer.findUnique({ where: { cpfHash }, select: { id: true } });
  const canSetCpf = !cpfOwner || cpfOwner.id === customer?.id;
  const consent = d.marketingOptIn ? { marketingOptIn: true, marketingOptAt: new Date() } : {};
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        email: d.email, name: d.name, phone: onlyDigits(d.phone),
        cpfEnc: encryptString(cpfDigits), cpfHash: canSetCpf ? cpfHash : null,
        passwordHash: d.createAccount && d.password ? await bcrypt.hash(d.password, 12) : null,
        ...consent,
      },
    });
  } else {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        phone: customer.phone ?? onlyDigits(d.phone),
        cpfEnc: customer.cpfEnc ?? encryptString(cpfDigits),
        cpfHash: customer.cpfHash ?? (canSetCpf ? cpfHash : null),
        passwordHash: customer.passwordHash ?? (d.createAccount && d.password ? await bcrypt.hash(d.password, 12) : null),
        ...consent,
      },
    });
  }

  const address = { recipient: d.name, postalCode: d.postalCode, street: d.street, number: d.number, complement: d.complement, district: d.district, city: d.city, state: d.state };
  if (logged || d.createAccount) {
    const exists = await prisma.customerAddress.findFirst({ where: { customerId: customer.id, postalCode: d.postalCode, number: d.number } });
    if (!exists) await prisma.customerAddress.create({ data: { customerId: customer.id, ...address, isDefault: !(await prisma.customerAddress.count({ where: { customerId: customer.id } })) } });
  }

  // pedido + reserva de estoque + uso do cupom (atômico)
  let order;
  try {
    order = await prisma.$transaction(async (t) => {
      const o = await t.order.create({
        data: {
          publicToken: randomToken(18),
          customerId: customer!.id,
          email: d.email, name: d.name, phone: onlyDigits(d.phone), cpfEnc: encryptString(cpfDigits),
          paymentMethod: d.paymentMethod, installments,
          subtotalCents: view.subtotalCents, discountCents: discountTotal, shippingCents, interestCents: interest, totalCents: total,
          couponCode: view.coupon?.code ?? null,
          addressEnc: encryptJson(address), shipCity: d.city, shipState: d.state, shipPostalCode: d.postalCode,
          shippingService: ship.name, shippingCarrier: ship.carrier, shippingServiceId: ship.id, shippingDays: ship.days,
          customerNote: d.note || null, utmSource: d.utmSource, utmCampaign: d.utmCampaign,
          stockReserved: true,
          reservationExpires: new Date(Date.now() + (isPix ? settings.payment.pixExpiresMinutes : settings.stock.reservationMinutes) * 60_000),
          items: {
            create: view.lines.map((l) => ({
              productId: l.productId, variantId: l.variantId, name: l.name, sku: l.sku,
              option: l.option ? `${l.optionName ?? "Opção"}: ${l.option}` : null, image: l.image,
              unitCents: isPix ? l.pixUnitCents : l.unitCents, quantity: l.quantity,
              totalCents: (isPix ? l.pixUnitCents : l.unitCents) * l.quantity, categoryIds: l.categoryIds,
            })),
          },
        },
        include: { items: true },
      });
      const tracked = await t.product.findMany({ where: { id: { in: view.lines.map((l) => l.productId) } }, select: { id: true, trackStock: true } });
      await reserve(t, view.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, trackStock: tracked.find((p) => p.id === l.productId)?.trackStock !== false })), o.id, settings.stock.allowBackorder);
      if (view.coupon?.code) {
        const c = await t.coupon.findUniqueOrThrow({ where: { code: view.coupon.code } });
        const r = await t.coupon.updateMany({ where: { id: c.id, OR: [{ maxUses: null }, { usedCount: { lt: c.maxUses ?? 0 } }] }, data: { usedCount: { increment: 1 } } });
        if (!r.count) throw new StockError("Este cupom atingiu o limite de usos.");
      }
      await t.cart.update({ where: { id: cartRow.id }, data: { status: "CONVERTED", orderId: o.id, email: d.email, name: d.name } });
      return o;
    });
  } catch (e) {
    if (e instanceof StockError) return { ok: false, error: e.message };
    throw e;
  }
  await addEvent(order.id, "system", `Pedido criado (${isPix ? "Pix" : `cartão em ${installments}x`}).`, null, { internal: false });

  // cobrança na Pagar.me
  const pgAddress: pagarme.PgAddress = { line_1: `${d.number}, ${d.street}, ${d.district}`.slice(0, 256), line_2: d.complement || undefined, zip_code: d.postalCode, city: d.city, state: d.state, country: "BR" };
  const amounts = allocate(lineTotals, couponDiscount);
  const items = order.items.map((it, i) => ({ code: it.sku, description: `${it.name}${it.option ? ` (${it.option})` : ""} x${it.quantity}`, amount: amounts[i] }));
  if (interest) items.push({ code: "JUROS", description: `Juros do parcelamento em ${installments}x`, amount: interest });
  const payment = await prisma.payment.create({ data: { orderId: order.id, provider: "pagarme", method: d.paymentMethod, amountCents: total, installments } });
  try {
    const pg = await pagarme.createOrder({
      code: `LUX${order.number}`,
      customer: { name: d.name, email: d.email, cpf: cpfDigits, phone: d.phone, address: pgAddress },
      items: items.filter((i) => i.amount > 0),
      shipping: { amount: shippingCents, description: ship.name, recipient_name: d.name, address: pgAddress },
      payment: isPix
        ? { method: "pix", expiresInSeconds: settings.payment.pixExpiresMinutes * 60, additionalInfo: [{ name: "Pedido", value: `#${order.number}` }] }
        : { method: "credit_card", cardToken: d.cardToken!, installments, statementDescriptor: settings.payment.statementDescriptor, billingAddress: pgAddress },
      metadata: { order_id: order.id, order_number: String(order.number) },
      ip: await clientIp(),
    });
    const charge = pg.charges?.[0];
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerOrderId: pg.id,
        providerChargeId: charge?.id,
        pixQrCode: charge?.last_transaction?.qr_code,
        pixQrCodeUrl: charge?.last_transaction?.qr_code_url,
        pixExpiresAt: charge?.last_transaction?.expires_at ? new Date(charge.last_transaction.expires_at) : null,
      },
    });
    await applyPaymentUpdate(payment.id, charge ?? null, pg.status);
  } catch (e) {
    console.error("[checkout] falha na Pagar.me", e);
    await prisma.$transaction(async (t) => {
      await releaseReservation(t, order.id, "Falha ao criar cobrança");
      await t.order.update({ where: { id: order.id }, data: { status: "CANCELED", paymentStatus: "FAILED", canceledAt: new Date() } });
      await t.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: e instanceof Error ? e.message.slice(0, 300) : "erro" } });
      if (order.couponCode) await t.coupon.updateMany({ where: { code: order.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
      await t.cart.update({ where: { id: cartRow.id }, data: { status: "ACTIVE", orderId: null } });
    });
    const msg = e instanceof pagarme.PagarmeError && e.status === 422 ? "Os dados de pagamento foram recusados. Confira e tente novamente." : "Não foi possível processar o pagamento agora. Nenhum valor foi cobrado. Tente novamente.";
    return { ok: false, error: msg };
  }

  const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true, payments: true } });
  if (!isPix && (fresh.status === "CANCELED" || fresh.paymentStatus === "FAILED")) {
    // cartão recusado: devolve o carrinho para o cliente tentar outro cartão ou Pix
    await prisma.cart.update({ where: { id: cartRow.id }, data: { status: "ACTIVE", orderId: null } });
    return { ok: false, error: fresh.payments[0]?.failureReason ? `Pagamento não aprovado: ${fresh.payments[0].failureReason}` : "Pagamento não aprovado pela operadora. Tente outro cartão ou pague com Pix." };
  }
  if (d.createAccount && !logged) await startCustomerSession(customer.id);
  if (fresh.status === "AWAITING_PAYMENT") await orderMails.created(fresh, isPix);
  return { ok: true, token: fresh.publicToken };
}

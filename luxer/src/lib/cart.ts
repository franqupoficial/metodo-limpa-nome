import "server-only";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { randomToken, sha256 } from "./crypto";
import { getSettings } from "./settings";
import { evaluateCoupon, pixPrice, maxInstallmentsFor, installmentPlan } from "./pricing";
import { mediaUrl } from "./media-url";
import { getCustomer } from "./customer-auth";

export const CART_COOKIE = "lx_cart";

async function cartToken(create: boolean): Promise<string | null> {
  const jar = await cookies();
  let t = jar.get(CART_COOKIE)?.value ?? null;
  if (!t && create) {
    t = randomToken(24);
    jar.set(CART_COOKIE, t, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 });
  }
  return t;
}

export async function getCartRow(create = false) {
  const t = await cartToken(create);
  if (!t) return null;
  const hash = sha256(t);
  let cart = await prisma.cart.findUnique({ where: { tokenHash: hash } });
  if (cart && cart.status === "CONVERTED") {
    if (!create) return null;
    // carrinho já virou pedido: começa outro
    const nt = randomToken(24);
    (await cookies()).set(CART_COOKIE, nt, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 });
    cart = await prisma.cart.create({ data: { tokenHash: sha256(nt) } });
  }
  if (!cart && create) cart = await prisma.cart.create({ data: { tokenHash: hash } });
  if (cart && cart.status === "ABANDONED") cart = await prisma.cart.update({ where: { id: cart.id }, data: { status: "ACTIVE" } });
  if (cart && !cart.customerId) {
    const c = await getCustomer();
    if (c) cart = await prisma.cart.update({ where: { id: cart.id }, data: { customerId: c.id, email: cart.email ?? c.email, name: cart.name ?? c.name } });
  }
  return cart;
}

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  option: string | null;
  optionName: string | null;
  sku: string;
  image: string | null;
  unitCents: number;
  pixUnitCents: number;
  quantity: number;
  totalCents: number;
  available: number;
  maxInstallments: number | null;
  categoryIds: string[];
  problem: string | null;
  shipping: { weightG: number | null; lengthCm: number | null; widthCm: number | null; heightCm: number | null };
};

export type CartView = Awaited<ReturnType<typeof buildCartView>>;

export async function buildCartView(cartId: string | null) {
  const settings = await getSettings();
  const cart = cartId
    ? await prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          items: {
            orderBy: { createdAt: "asc" },
            include: { variant: { include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 }, categories: { select: { categoryId: true } } } } } } },
          },
        },
      })
    : null;
  const now = new Date();
  const lines: CartLine[] = (cart?.items ?? []).map((it) => {
    const v = it.variant;
    const p = v.product;
    const unit = v.priceCents ?? p.priceCents;
    const avail = !p.trackStock || settings.stock.allowBackorder ? 999 : Math.max(0, v.stock - v.reserved);
    const visible = p.status === "ACTIVE" && (!p.publishAt || p.publishAt <= now) && v.active;
    return {
      id: it.id,
      variantId: v.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      option: v.option,
      optionName: p.optionName,
      sku: v.sku,
      image: mediaUrl(p.images[0]?.thumbKey ?? p.images[0]?.key),
      unitCents: unit,
      pixUnitCents: pixPrice(unit, settings.payment, v.priceCents == null ? p.pixPriceCents : null),
      quantity: it.quantity,
      totalCents: unit * it.quantity,
      available: avail,
      maxInstallments: p.maxInstallments,
      categoryIds: p.categories.map((c) => c.categoryId),
      problem: !visible ? "Produto indisponível" : avail < it.quantity ? (avail === 0 ? "Esgotado" : `Apenas ${avail} disponível(is)`) : null,
      shipping: { weightG: p.packageWeightG ?? (p.weightG ? Math.ceil(Number(p.weightG)) + 250 : null), lengthCm: p.packageLengthCm, widthCm: p.packageWidthCm, heightCm: p.packageHeightCm },
    };
  });
  const subtotal = lines.reduce((a, l) => a + l.totalCents, 0);
  const pixSubtotal = lines.reduce((a, l) => a + l.pixUnitCents * l.quantity, 0);

  let coupon: { code: string; discountCents: number; freeShipping: boolean; error?: string } | null = null;
  if (cart?.couponCode) {
    const c = await prisma.coupon.findUnique({ where: { code: cart.couponCode } });
    if (!c) coupon = { code: cart.couponCode, discountCents: 0, freeShipping: false, error: "Cupom inválido." };
    else {
      const customerId = cart.customerId;
      const customerOrders = customerId ? await prisma.order.count({ where: { customerId, status: { notIn: ["CANCELED"] } } }) : 0;
      const customerUses = customerId ? await prisma.order.count({ where: { customerId, couponCode: c.code, status: { notIn: ["CANCELED"] } } }) : 0;
      const eligible = c.categoryIds.length ? lines.filter((l) => l.categoryIds.some((id) => c.categoryIds.includes(id))).reduce((a, l) => a + l.totalCents, 0) : subtotal;
      const r = evaluateCoupon(c, { subtotalCents: subtotal, eligibleSubtotalCents: eligible, customerOrders, customerUses, usesPerCustomer: c.usesPerCustomer });
      coupon = r.ok ? { code: c.code, discountCents: r.discountCents, freeShipping: r.freeShipping } : { code: c.code, discountCents: 0, freeShipping: false, error: r.error };
    }
  }
  const discount = coupon?.discountCents ?? 0;
  const productMax = lines.reduce<number | null>((m, l) => (l.maxInstallments ? Math.min(m ?? 99, l.maxInstallments) : m), null);
  const base = Math.max(0, subtotal - discount);
  const maxInst = maxInstallmentsFor(base, settings.payment, productMax);
  return {
    cart,
    lines,
    count: lines.reduce((a, l) => a + l.quantity, 0),
    subtotalCents: subtotal,
    /** economia do Pix sobre o subtotal (antes do cupom) */
    pixSavingsCents: subtotal - pixSubtotal,
    coupon,
    discountCents: discount,
    hasProblems: lines.some((l) => l.problem),
    installments: { max: maxInst, plan: installmentPlan(base, maxInst, settings.payment) },
    payment: settings.payment,
  };
}

export async function getCartView() {
  const cart = await getCartRow(false);
  return buildCartView(cart?.id ?? null);
}

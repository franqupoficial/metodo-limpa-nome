"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCartRow } from "@/lib/cart";
import { getSettings } from "@/lib/settings";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-meta";
import { isValidEmail } from "@/lib/validators";

export type CartResult = { ok: boolean; message: string; count?: number };

async function limited() {
  return !(await rateLimit(`cart:${await clientIp()}`, 120, 600));
}

export async function addToCart(variantId: string, quantity = 1): Promise<CartResult> {
  if (await limited()) return { ok: false, message: "Muitas solicitações. Aguarde um instante." };
  const qty = Math.max(1, Math.min(10, Math.floor(quantity)));
  const v = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: true } });
  const now = new Date();
  if (!v || !v.active || v.product.status !== "ACTIVE" || (v.product.publishAt && v.product.publishAt > now)) return { ok: false, message: "Esta peça não está disponível." };
  const s = await getSettings();
  const cart = (await getCartRow(true))!;
  const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const want = (existing?.quantity ?? 0) + qty;
  if (v.product.trackStock && !s.stock.allowBackorder && v.stock - v.reserved < want) {
    const avail = Math.max(0, v.stock - v.reserved);
    return { ok: false, message: avail ? `Temos apenas ${avail} unidade(s) disponível(is).` : "Peça esgotada no momento." };
  }
  await prisma.cartItem.upsert({ where: { cartId_variantId: { cartId: cart.id, variantId } }, create: { cartId: cart.id, variantId, quantity: qty }, update: { quantity: want } });
  await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  const count = (await prisma.cartItem.aggregate({ where: { cartId: cart.id }, _sum: { quantity: true } }))._sum.quantity ?? 0;
  revalidatePath("/", "layout");
  return { ok: true, message: "Adicionado à sacola.", count };
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartResult> {
  if (await limited()) return { ok: false, message: "Muitas solicitações." };
  const cart = await getCartRow(false);
  if (!cart) return { ok: false, message: "Carrinho não encontrado." };
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
  if (!item) return { ok: false, message: "Item não encontrado." };
  if (quantity <= 0) await prisma.cartItem.delete({ where: { id: item.id } });
  else await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(10, Math.floor(quantity)) } });
  await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Sacola atualizada." };
}

export async function applyCoupon(code: string): Promise<CartResult> {
  if (await limited()) return { ok: false, message: "Muitas tentativas." };
  if (!(await rateLimit(`coupon:${await clientIp()}`, 15, 900))) return { ok: false, message: "Muitas tentativas de cupom. Aguarde 15 minutos." };
  const cart = await getCartRow(true);
  const c = code.trim().toUpperCase();
  if (!c) {
    await prisma.cart.update({ where: { id: cart!.id }, data: { couponCode: null } });
    revalidatePath("/carrinho");
    return { ok: true, message: "Cupom removido." };
  }
  const coupon = await prisma.coupon.findUnique({ where: { code: c } });
  if (!coupon || !coupon.active) return { ok: false, message: "Cupom inválido." };
  await prisma.cart.update({ where: { id: cart!.id }, data: { couponCode: c } });
  revalidatePath("/carrinho");
  return { ok: true, message: "Cupom aplicado." };
}

/** E-mail informado no checkout: permite a recuperação do carrinho (aviso exibido no formulário). */
export async function rememberCheckoutEmail(email: string, name: string) {
  const e = email.trim().toLowerCase();
  if (!isValidEmail(e)) return;
  const cart = await getCartRow(false);
  if (cart && cart.status === "ACTIVE") await prisma.cart.update({ where: { id: cart.id }, data: { email: e, name: name.slice(0, 120) || cart.name } });
}

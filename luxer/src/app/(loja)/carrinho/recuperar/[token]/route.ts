import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { CART_COOKIE } from "@/lib/cart";

/** Link do e-mail de recuperação: reassocia o carrinho a este navegador. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cart = await prisma.cart.findUnique({ where: { recoveryToken: token } });
  const url = new URL("/carrinho", req.url);
  if (!cart || cart.status === "CONVERTED") return Response.redirect(url, 302);
  const t = randomToken(24);
  await prisma.cart.update({ where: { id: cart.id }, data: { tokenHash: sha256(t), status: "ACTIVE", recoveredAt: new Date() } });
  (await cookies()).set(CART_COOKIE, t, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 });
  return Response.redirect(url, 302);
}

"use server";
import { placeOrder, type CheckoutInput, type CheckoutResult } from "@/lib/checkout";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-meta";

export async function placeOrderAction(input: CheckoutInput): Promise<CheckoutResult> {
  const ip = await clientIp();
  if (!(await rateLimit(`checkout:${ip}`, 10, 900))) return { ok: false, error: "Muitas tentativas de pagamento. Aguarde 15 minutos ou fale conosco." };
  try {
    return await placeOrder(input);
  } catch (e) {
    console.error("[checkout]", e);
    return { ok: false, error: "Não foi possível concluir o pedido. Nenhum valor foi cobrado. Tente novamente." };
  }
}

import { prisma } from "@/lib/db";
import { getObject } from "@/lib/storage";
import { keyedHash, safeEqual } from "@/lib/crypto";

/** Resultado retido temporariamente (apenas com link assinado e dentro do prazo de retenção). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const k = new URL(req.url).searchParams.get("k") ?? "";
  if (!safeEqual(k, keyedHash(`tryon-result|${id}`).slice(0, 24))) return new Response("Not found", { status: 404 });
  const r = await prisma.tryOnRequest.findUnique({ where: { id } });
  if (!r?.resultKey || !r.resultExpiresAt || r.resultExpiresAt < new Date()) return new Response("Expirado", { status: 410 });
  const obj = await getObject(r.resultKey);
  if (!obj) return new Response("Expirado", { status: 410 });
  return new Response(new Uint8Array(obj.body), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store" } });
}

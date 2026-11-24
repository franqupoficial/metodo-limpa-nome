import { prisma } from "@/lib/db";
import { clientIp, userAgent, sameOrigin } from "@/lib/request-meta";
import { keyedHash } from "@/lib/crypto";

/** Contagem anônima de visitantes únicos por dia (hash com chave + data; não armazena IP). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response(null, { status: 204 });
  const ua = await userAgent();
  if (/bot|crawl|spider|preview|headless/i.test(ua)) return new Response(null, { status: 204 });
  const local = new Date(Date.now() - 3 * 3600_000);
  const day = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  const visitorKey = keyedHash(`${day.toISOString()}|${await clientIp()}|${ua}`).slice(0, 32);
  await prisma.dailyVisit.createMany({ data: [{ day, visitorKey }], skipDuplicates: true }).catch(() => {});
  return new Response(null, { status: 204 });
}

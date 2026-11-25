import { prisma } from "@/lib/db";
import { decryptBuffer } from "@/lib/crypto";
import { loadOwned } from "@/lib/ai/tryon-access";

/** Resultado da simulação, descriptografado sob demanda; expira conforme a retenção configurada. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await loadOwned(id, new URL(req.url).searchParams.get("t"));
  if (!r) return new Response("Não encontrado", { status: 404 });
  const a = await prisma.tryOnAsset.findUnique({ where: { requestId_kind: { requestId: id, kind: "RESULT" } } });
  if (!a || a.expiresAt < new Date()) return new Response("Expirado", { status: 410 });
  return new Response(new Uint8Array(decryptBuffer(Buffer.from(a.data))), {
    headers: { "Content-Type": a.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": `inline; filename="luxer-ai-${id.slice(-6)}.jpg"` },
  });
}

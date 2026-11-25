import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { loadOwned } from "@/lib/ai/tryon-access";
import { customerMessage } from "@/lib/ai/tryon-pipeline";

type P = { params: Promise<{ id: string }> };
const noStore = { "Cache-Control": "no-store" };

/** Andamento de uma simulação (somente para quem tem o token). */
export async function GET(req: Request, { params }: P) {
  const { id } = await params;
  const r = await loadOwned(id, new URL(req.url).searchParams.get("t"));
  if (!r) return Response.json({ ok: false, error: "Simulação não encontrada." }, { status: 404, headers: noStore });
  const s = (await getSettings()).ai;
  const region = r.region as { target?: number[] } | null;
  const result = r.status === "SUCCEEDED" ? await prisma.tryOnAsset.findUnique({ where: { requestId_kind: { requestId: id, kind: "RESULT" } }, select: { expiresAt: true } }) : null;
  return Response.json({
    ok: true, status: r.status, stage: r.stage, generations: r.generations,
    target: region?.target ?? null,
    fidelity: r.status === "SUCCEEDED" ? r.fidelityScore : null,
    expiresAt: result?.expiresAt ?? null,
    expired: r.status === "SUCCEEDED" && !result,
    error: r.status === "FAILED" || r.status === "BLOCKED" ? customerMessage(r.errorCode, r.errorMessage) : null,
    retryable: r.errorCode !== "multiple_people",
    disclaimer: s.disclaimer,
  }, { headers: noStore });
}

/** Exclusão imediata das imagens a pedido do cliente. */
export async function DELETE(req: Request, { params }: P) {
  const { id } = await params;
  const r = await loadOwned(id, new URL(req.url).searchParams.get("t"));
  if (!r) return Response.json({ ok: false }, { status: 404, headers: noStore });
  const { count } = await prisma.tryOnAsset.deleteMany({ where: { requestId: id } });
  return Response.json({ ok: true, deleted: count }, { headers: noStore });
}

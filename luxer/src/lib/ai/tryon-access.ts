import "server-only";
import { prisma } from "../db";
import { keyedHash, safeEqual } from "../crypto";

/** Acesso a uma simulação: somente quem enviou a foto recebe o token (guardado aqui apenas como hash). */
export const tokenHashOf = (token: string) => keyedHash(`tryon-token|${token}`);

export async function loadOwned(id: string, token: string | null) {
  if (!token || !/^[\w-]{20,60}$/.test(token) || !/^c[a-z0-9]{20,30}$/.test(id)) return null;
  const r = await prisma.tryOnRequest.findUnique({ where: { id } });
  if (!r?.tokenHash || !safeEqual(r.tokenHash, tokenHashOf(token))) return null;
  // trabalho travado (ex.: instância encerrada): encerra com erro para o cliente poder tentar de novo
  if ((r.status === "QUEUED" || r.status === "PROCESSING") && Date.now() - r.createdAt.getTime() > 4 * 60_000) {
    await prisma.tryOnRequest.update({ where: { id }, data: { status: "FAILED", stage: "done", errorCode: "timeout", errorMessage: `Tempo esgotado na etapa ${r.stage}`, finishedAt: new Date() } });
    await prisma.tryOnAsset.deleteMany({ where: { requestId: id } });
    return { ...r, status: "FAILED" as const, stage: "done", errorCode: "timeout", errorMessage: null };
  }
  return r;
}

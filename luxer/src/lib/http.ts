import "server-only";
import { sameOrigin, clientIp } from "./request-meta";
import { rateLimit } from "./rate-limit";

/** Proteções padrão para APIs públicas que alteram estado: mesma origem + limite por IP. */
export async function guardPublic(req: Request, key: string, limit: number, windowSeconds: number): Promise<Response | null> {
  if (!sameOrigin(req)) return Response.json({ ok: false, error: "Origem inválida." }, { status: 403 });
  const ip = await clientIp();
  if (!(await rateLimit(`${key}:${ip}`, limit, windowSeconds))) return Response.json({ ok: false, error: "Muitas solicitações. Aguarde um instante." }, { status: 429 });
  return null;
}

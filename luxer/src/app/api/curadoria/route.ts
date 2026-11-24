import { curate, OCCASIONS, METALS, PIECES, type Occasion, type Metal, type Piece } from "@/lib/curation";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-meta";

export async function GET(req: Request) {
  if (!(await rateLimit(`curadoria:${await clientIp()}`, 60, 600))) return Response.json({ items: [] }, { status: 429 });
  const u = new URL(req.url).searchParams;
  const o = (u.get("ocasiao") ?? "uso") as Occasion, m = (u.get("metal") ?? "todos") as Metal, p = (u.get("peca") ?? "todas") as Piece;
  if (!(o in OCCASIONS) || !(m in METALS) || !(p in PIECES)) return Response.json({ items: [] }, { status: 400 });
  return Response.json({ items: await curate(o, m, p) });
}

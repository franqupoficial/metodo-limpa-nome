import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-meta";

/** Recebe erros do navegador (ver src/lib/client-errors.ts) e registra nos logs do servidor. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 4000) return new NextResponse(null, { status: 413 });
  if (!(await rateLimit(`client-error:${await clientIp()}`, 30, 3600))) return new NextResponse(null, { status: 429 });
  let d: { kind?: unknown; message?: unknown; stack?: unknown; path?: unknown; extra?: unknown };
  try { d = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
  const s = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  console.error(JSON.stringify({ tag: "client-error", kind: s(d.kind, 40), message: s(d.message, 300), path: s(d.path, 200).split("?")[0], stack: s(d.stack, 1200), extra: d.extra && typeof d.extra === "object" ? d.extra : undefined, ua: s(req.headers.get("user-agent"), 160) }));
  return new NextResponse(null, { status: 204 });
}

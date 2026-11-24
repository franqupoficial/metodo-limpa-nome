import { getObject, safeKey } from "@/lib/storage";

/** Serve arquivos do armazenamento. Fotos temporárias do provador (tryon/) não são públicas por esta rota. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  let k: string;
  try {
    k = safeKey(key.map(decodeURIComponent).join("/"));
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (k.startsWith("tryon/") || k.startsWith("private/")) return new Response("Not found", { status: 404 });
  const obj = await getObject(k);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(obj.body), {
    headers: { "Content-Type": obj.contentType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Armazenamento de arquivos (fotos de produtos, banners, mídia do CMS).
 * - local: disco (desenvolvimento ou servidor com volume persistente)
 * - s3: qualquer serviço compatível com S3 (Supabase Storage, Cloudflare R2, AWS S3)
 * Os arquivos são servidos por /media/<chave> ou diretamente por STORAGE_PUBLIC_URL (CDN), se definida.
 */
const driver = () => (process.env.STORAGE_DRIVER || "local") as "local" | "s3";
const localDir = () => path.resolve(process.env.STORAGE_LOCAL_DIR || "./storage/media");

let s3: S3Client | null = null;
function client() {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID || "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "" },
    });
  }
  return s3;
}
const bucket = () => {
  const b = process.env.S3_BUCKET;
  if (!b) throw new Error("S3_BUCKET não configurado.");
  return b;
};

export function safeKey(key: string): string {
  const k = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(k) || k.includes("..")) throw new Error("Chave de arquivo inválida.");
  return k;
}

export async function putObject(key: string, body: Buffer, contentType: string, cacheControl = "public, max-age=31536000, immutable") {
  const k = safeKey(key);
  if (driver() === "s3") {
    await client().send(new PutObjectCommand({ Bucket: bucket(), Key: k, Body: body, ContentType: contentType, CacheControl: cacheControl }));
    return k;
  }
  const file = path.join(localDir(), k);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
  return k;
}

export async function getObject(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  const k = safeKey(key);
  try {
    if (driver() === "s3") {
      const r = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: k }));
      const bytes = await r.Body!.transformToByteArray();
      return { body: Buffer.from(bytes), contentType: r.ContentType || guessType(k) };
    }
    const body = await fs.readFile(path.join(localDir(), k));
    return { body, contentType: guessType(k) };
  } catch {
    // disco local vazio (ex.: hospedagem serverless): busca o arquivo publicado na URL pública das imagens
    const cdn = process.env.NEXT_PUBLIC_MEDIA_URL;
    if (cdn && driver() === "local") {
      try {
        const base = cdn.startsWith("http") ? cdn : (process.env.APP_URL || "").replace(/\/$/, "") + cdn;
        const r = await fetch(`${base.replace(/\/$/, "")}/${k.split("/").map(encodeURIComponent).join("/")}`, { cache: "force-cache" });
        if (r.ok) return { body: Buffer.from(await r.arrayBuffer()), contentType: r.headers.get("content-type") || guessType(k) };
      } catch {}
    }
    return null;
  }
}

export async function deleteObject(key: string) {
  const k = safeKey(key);
  if (driver() === "s3") {
    await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: k }));
    return;
  }
  await fs.rm(path.join(localDir(), k), { force: true });
}

export function guessType(k: string) {
  const ext = k.split(".").pop()?.toLowerCase();
  return (
    { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", svg: "image/svg+xml", avif: "image/avif", ico: "image/x-icon", mp4: "video/mp4", pdf: "application/pdf" } as Record<string, string>
  )[ext ?? ""] ?? "application/octet-stream";
}

export { mediaUrl } from "./media-url";

import "server-only";
import { prisma } from "./db";
import { IMAGE_MIMES, readUpload } from "./uploads";

export async function uploadPublicImage(file: File | null, alt: string): Promise<{ url: string } | { error: string } | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const up = await readUpload(file, IMAGE_MIMES);
  if ("error" in up) return up;
  const m = await prisma.media.create({ data: { mime: up.mime, size: up.buf.length, data: new Uint8Array(up.buf), alt } });
  return { url: `/media/${m.id}` };
}

export function safeImageUrl(v: string): string | null {
  if (!v) return null;
  if (/^\/media\/[a-z0-9]+$/.test(v) || /^https:\/\/[^\s"'<>]+$/.test(v)) return v.slice(0, 500);
  return null;
}

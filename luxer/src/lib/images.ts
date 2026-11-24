import "server-only";
import sharp from "sharp";
import { randomToken } from "./crypto";
import { putObject } from "./storage";
import { prisma } from "./db";

const MAX_BYTES = 12 * 1024 * 1024;

/** Valida pela assinatura do arquivo (não confia na extensão nem no Content-Type informado). */
export function sniffImage(buf: Buffer): "jpeg" | "png" | "webp" | "gif" | "avif" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (buf.subarray(0, 3).toString("ascii") === "GIF") return "gif";
  if (buf.subarray(4, 12).toString("ascii").startsWith("ftypavi")) return "avif";
  return null;
}

export type StoredImage = { key: string; thumbKey: string; width: number; height: number };

/** Normaliza (remove metadados EXIF/GPS), gera versão principal e miniatura em WebP e armazena. */
export async function storeImage(input: Buffer, folder: string, baseName?: string, opts: { max?: number; thumb?: number } = {}): Promise<StoredImage> {
  if (input.length > MAX_BYTES) throw new Error("Imagem acima de 12 MB.");
  if (!sniffImage(input)) throw new Error("Formato de imagem não suportado. Envie JPG, PNG, WebP ou AVIF.");
  const name = baseName ?? `${Date.now().toString(36)}-${randomToken(6)}`;
  const img = sharp(input, { failOn: "error" }).rotate();
  const main = await img.clone().resize({ width: opts.max ?? 1600, height: opts.max ?? 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  const thumb = await img.clone().resize({ width: opts.thumb ?? 600, height: opts.thumb ?? 600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  const key = await putObject(`${folder}/${name}.webp`, main.data, "image/webp");
  const thumbKey = await putObject(`${folder}/${name}-thumb.webp`, thumb, "image/webp");
  return { key, thumbKey, width: main.info.width, height: main.info.height };
}

/** Upload genérico para a biblioteca de mídia (banners, páginas, logotipo). */
export async function storeMedia(file: File, folder: string, adminId?: string) {
  const buf = Buffer.from(await file.arrayBuffer());
  const stored = await storeImage(buf, `media/${folder}`, undefined, { max: 2400, thumb: 800 });
  await prisma.media.create({ data: { key: stored.key, mime: "image/webp", size: buf.length, width: stored.width, height: stored.height, folder, uploadedBy: adminId } });
  return stored;
}

import "server-only";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const DOC_MIMES = ["image/jpeg", "image/png", "application/pdf"] as const;
export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Detecta o tipo real pelo conteúdo (magic bytes), ignorando extensão e Content-Type informados. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

export async function readUpload(file: File, allowed: readonly string[]): Promise<{ buf: Buffer; mime: string } | { error: string }> {
  if (file.size === 0) return { error: "Arquivo vazio." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Arquivo maior que 5 MB." };
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || !allowed.includes(mime)) return { error: "Formato de arquivo não permitido." };
  return { buf, mime };
}

export const safeFileName = (name: string) => name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "arquivo";

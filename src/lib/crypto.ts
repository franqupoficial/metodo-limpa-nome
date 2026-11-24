import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function loadKey(name: string): Buffer {
  const raw = process.env[name];
  if (!raw) throw new Error(`Variável de ambiente ${name} não configurada.`);
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error(`${name} deve conter 32 bytes em base64.`);
  return key;
}

let encKey: Buffer | null = null;
let hashKey: Buffer | null = null;
const getEncKey = () => (encKey ??= loadKey("DATA_ENCRYPTION_KEY"));
const getHashKey = () => (hashKey ??= loadKey("HASH_KEY"));

/** Criptografa bytes com AES-256-GCM. Formato: [versão(1)][iv(12)][tag(16)][dados] */
export function encryptBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncKey(), iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), data]);
}

export function decryptBuffer(payload: Buffer): Buffer {
  if (payload[0] !== 1) throw new Error("Formato criptográfico desconhecido.");
  const iv = payload.subarray(1, 13);
  const tag = payload.subarray(13, 29);
  const decipher = createDecipheriv("aes-256-gcm", getEncKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(payload.subarray(29)), decipher.final()]);
}

export const encryptString = (s: string) => encryptBuffer(Buffer.from(s, "utf8")).toString("base64");
export const decryptString = (s: string) => decryptBuffer(Buffer.from(s, "base64")).toString("utf8");
export const encryptJson = (v: unknown) => encryptString(JSON.stringify(v));
export const decryptJson = <T = unknown>(s: string): T => JSON.parse(decryptString(s)) as T;

/** HMAC determinístico para buscas (ex.: CPF) sem armazenar o valor em claro. */
export const keyedHash = (value: string) => createHmac("sha256", getHashKey()).update(value).digest("hex");

export const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

/** URL pública de um arquivo armazenado. */
export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (/^https?:\/\//.test(key)) return key;
  const cdn = process.env.NEXT_PUBLIC_MEDIA_URL;
  const enc = key.split("/").map(encodeURIComponent).join("/");
  return cdn ? `${cdn.replace(/\/$/, "")}/${enc}` : `/media/${enc}`;
}

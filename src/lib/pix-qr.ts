import "server-only";
import QRCode from "qrcode";

/** QR Code em SVG (data URL) para exibição segura via <img>. */
export async function pixQrDataUrl(payload: string): Promise<string> {
  const svg = await QRCode.toString(payload, { type: "svg", errorCorrectionLevel: "M", margin: 1, width: 240 });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

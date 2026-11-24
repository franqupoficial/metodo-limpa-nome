import { ImageResponse } from "next/og";

export const alt = "Portal Consumidor — Informação, orientação e serviços digitais";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg,#0b2d5a,#124a93)", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: 24, background: "white", color: "#124a93", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, fontWeight: 900 }}>P</div>
          <div style={{ fontSize: 64, fontWeight: 800 }}>Portal Consumidor</div>
        </div>
        <div style={{ marginTop: 32, fontSize: 36, color: "#d8e5f7" }}>Informação, orientação e serviços digitais</div>
      </div>
    ),
    size,
  );
}

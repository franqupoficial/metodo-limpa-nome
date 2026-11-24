import type { Metadata, Viewport } from "next";
import "./globals.css";

const base = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: { default: "Portal Consumidor — Informação, orientação e serviços digitais", template: "%s | Portal Consumidor" },
  description:
    "Acesse serviços digitais, encontre informações e solicite atendimento de forma simples e organizada: regularização de apontamentos no CPF, abertura de CNPJ, empréstimo para negativados e locação de veículos para motoristas de aplicativo.",
  applicationName: "Portal Consumidor",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Portal Consumidor" },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#124a93", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

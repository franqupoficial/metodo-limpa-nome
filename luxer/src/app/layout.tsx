import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { mediaUrl } from "@/lib/media-url";
import { appUrl } from "@/lib/mail";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const og = mediaUrl(s.seo.ogImageKey);
  return {
    metadataBase: new URL(appUrl()),
    title: { default: s.seo.title, template: `%s | ${s.store.name}` },
    description: s.seo.description,
    openGraph: { siteName: s.store.name, locale: "pt_BR", type: "website", images: og ? [og] : undefined },
    icons: s.store.faviconKey ? { icon: mediaUrl(s.store.faviconKey)! } : undefined,
    verification: s.analytics.googleSiteVerification ? { google: s.analytics.googleSiteVerification } : undefined,
  };
}

export const viewport: Viewport = { themeColor: "#0b0b0c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

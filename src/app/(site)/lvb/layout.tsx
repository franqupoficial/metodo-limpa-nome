import type { Metadata } from "next";
import { getEnabledServices } from "@/lib/settings";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";

export async function generateMetadata(): Promise<Metadata> {
  const enabled = await getEnabledServices();
  return enabled.LVB ? {} : { robots: { index: false, follow: false } };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const enabled = await getEnabledServices();
  if (!enabled.LVB) return <ServiceUnavailable name="LVB — Locação de veículos" />;
  return <>{children}</>;
}

import type { Metadata } from "next";
import { getEnabledServices } from "@/lib/settings";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";

export async function generateMetadata(): Promise<Metadata> {
  const enabled = await getEnabledServices();
  return enabled.EMPRESTIMO ? {} : { robots: { index: false, follow: false } };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const enabled = await getEnabledServices();
  if (!enabled.EMPRESTIMO) return <ServiceUnavailable name="Empréstimo" />;
  return <>{children}</>;
}

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getEnabledServices } from "@/lib/settings";
import { hiddenPaths } from "@/lib/services";

// Renderização sob demanda: o build não depende do banco e alterações do painel aparecem na hora.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const hidden = hiddenPaths(await getEnabledServices());
  return (
    <>
      <Header hidden={hidden} />
      <main id="conteudo">{children}</main>
      <Footer />
    </>
  );
}

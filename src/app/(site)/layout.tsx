import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Renderização sob demanda: o build não depende do banco e alterações do painel aparecem na hora.
export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="conteudo">{children}</main>
      <Footer />
    </>
  );
}

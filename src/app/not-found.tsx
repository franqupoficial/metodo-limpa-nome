import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="conteudo" className="container-portal py-20 text-center">
        <p className="eyebrow">Erro 404</p>
        <h1 className="mt-2 text-3xl font-extrabold">Página não encontrada</h1>
        <p className="mt-3 text-muted">O endereço pode ter sido digitado incorretamente ou a página não existe mais.</p>
        <div className="mt-6 flex justify-center gap-3"><Link href="/" className="btn-primary">Página inicial</Link><Link href="/busca" className="btn-secondary">Buscar</Link></div>
      </main>
      <Footer />
    </>
  );
}

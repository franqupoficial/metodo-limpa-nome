import Link from "next/link";
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ivory px-6 text-center">
      <div className="font-serif text-4xl tracking-[0.4em]">LUXER</div>
      <h1 className="display mt-10 text-5xl">Página não encontrada</h1>
      <p className="mt-4 text-stone">A peça ou página que você procura não está mais disponível.</p>
      <Link href="/" className="btn-gold mt-10">Voltar à loja</Link>
    </div>
  );
}

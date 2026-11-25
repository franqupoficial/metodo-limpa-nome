import Link from "next/link";
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ivory px-6 text-center">
      <div className="font-serif text-3xl tracking-[0.46em] [margin-right:-0.46em]">LUXER</div>
      <div className="mt-16 h-px w-12 bg-gold" />
      <h1 className="display mt-10 text-[2.6rem] sm:text-6xl">Página não encontrada</h1>
      <p className="mt-5 text-[14px] text-ink/60">A peça ou página que você procura não está mais disponível.</p>
      <Link href="/" className="btn-gold mt-10">Voltar à loja</Link>
    </div>
  );
}

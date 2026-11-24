import Link from "next/link";
import { Icon } from "./Icon";

export function ServiceUnavailable({ name }: { name: string }) {
  return (
    <div className="container-portal py-20 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Icon name="clock" className="h-7 w-7" /></span>
      <h1 className="mt-4 text-2xl font-extrabold">{name}: em breve</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">Este serviço está temporariamente indisponível. Enquanto isso, conheça nossos outros serviços.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/servicos" className="btn-primary">Ver serviços</Link>
        <Link href="/" className="btn-secondary">Página inicial</Link>
      </div>
    </div>
  );
}

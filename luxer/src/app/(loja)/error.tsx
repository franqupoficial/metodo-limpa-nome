"use client";
import Link from "next/link";
import { useEffect } from "react";
import { reportClientError } from "@/lib/client-errors";

/** Falha inesperada numa página da loja: mensagem discreta, nova tentativa e caminho de volta — e o erro vai ao monitor. */
export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClientError("route", error, error.digest ? { digest: error.digest } : undefined); }, [error]);
  return (
    <div className="mx-auto max-w-xl px-6 py-28 text-center sm:py-40">
      <div className="eyebrow text-stone">Luxer Joias</div>
      <h1 className="display mt-5 text-[2.4rem] sm:text-[3.2rem]">Algo não saiu como deveria.</h1>
      <p className="mx-auto mt-5 max-w-md text-[14px] leading-relaxed text-ink/60">Esta página não carregou corretamente. Tente novamente — sua sacola continua guardada.</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        <button type="button" onClick={reset} className="btn-gold">Tentar novamente</button>
        <Link href="/" className="link-line text-ink">Voltar ao início</Link>
      </div>
    </div>
  );
}

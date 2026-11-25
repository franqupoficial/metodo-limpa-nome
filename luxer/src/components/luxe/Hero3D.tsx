"use client";
import dynamic from "next/dynamic";

/** Carrega o Hero 3D só no navegador (WebGL), com um quadro estático equivalente durante o carregamento. */
const Hero3DCanvas = dynamic(() => import("./Hero3DCanvas").then((m) => m.Hero3DCanvas), {
  ssr: false,
  loading: () => (
    <section className="relative flex h-svh items-end justify-center bg-[#050505] pb-[14vh] text-center text-[#f5f5f7]">
      <div className="px-6"><div className="text-[10px] uppercase tracking-[0.5em] text-[#86868b]">Luxer Joias · Curitiba</div><h1 className="mt-5 font-serif text-[2.6rem] leading-[1.02] tracking-tight sm:text-[4.6rem]">LUXER <span className="text-[#d4af37]">—</span> <span className="italic">A arte do ouro eterno</span></h1></div>
    </section>
  ),
});

export function Hero3D(props: { priceFrom: string | null; models: number; href: string }) {
  return <Hero3DCanvas {...props} />;
}

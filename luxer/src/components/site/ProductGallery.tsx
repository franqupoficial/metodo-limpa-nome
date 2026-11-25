"use client";
import { useState } from "react";

/** Galeria com miniaturas, zoom por hover (desktop) e tela cheia (toque). */
export function ProductGallery({ images, name, videos }: { images: { src: string; thumb: string; alt: string }[]; name: string; videos: string[] }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [full, setFull] = useState(false);
  if (!images.length) return <div className="flex aspect-square items-center justify-center bg-plate font-serif text-3xl tracking-[0.4em] text-stone/30">LUXER</div>;
  const cur = images[i];
  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row lg:gap-5">
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto lg:max-h-[680px] lg:flex-col lg:overflow-y-auto [scrollbar-width:none]">
          {images.map((im, k) => (
            <button key={im.src} onClick={() => setI(k)} aria-label={`Foto ${k + 1}`} aria-current={k === i} className={`relative h-[76px] w-[76px] shrink-0 overflow-hidden bg-plate transition-opacity after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-ink after:transition-opacity ${k === i ? "after:opacity-100" : "opacity-60 after:opacity-0 hover:opacity-100"}`}>
              <img src={im.thumb} alt="" className="h-full w-full object-contain p-1.5" />
            </button>
          ))}
        </div>
      )}
      <div className="relative flex-1">
        <div
          className="relative aspect-square cursor-zoom-in overflow-hidden bg-plate"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
          onClick={() => setFull(true)}
        >
          <img src={cur.src} alt={cur.alt || name} className="h-full w-full object-contain transition-transform duration-300 ease-out" style={zoom ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} fetchPriority="high" />
        </div>
        {images.length > 1 && <p className="mt-3 text-center text-[11px] tabular-nums tracking-[0.2em] text-stone lg:hidden">{i + 1} / {images.length}</p>}
      </div>
      {full && (
        <div className="fixed inset-0 z-[70] flex animate-[fade-in_.3s_ease] items-center justify-center bg-plate" onClick={() => setFull(false)} role="dialog" aria-modal="true" aria-label={name}>
          <button className="absolute right-4 top-4 p-3 text-[11px] uppercase tracking-[0.22em]" aria-label="Fechar">Fechar</button>
          {images.length > 1 && <button className="absolute left-2 p-4 text-3xl font-light text-ink/60 hover:text-ink" onClick={(e) => { e.stopPropagation(); setI((i - 1 + images.length) % images.length); }} aria-label="Anterior">‹</button>}
          <img src={cur.src} alt={cur.alt || name} className="max-h-[92vh] max-w-[94vw] object-contain" />
          {images.length > 1 && <button className="absolute right-2 p-4 text-3xl font-light text-ink/60 hover:text-ink" onClick={(e) => { e.stopPropagation(); setI((i + 1) % images.length); }} aria-label="Próxima">›</button>}
        </div>
      )}
      {videos.length > 0 && <span className="sr-only">{videos.length} vídeo(s) abaixo</span>}
    </div>
  );
}

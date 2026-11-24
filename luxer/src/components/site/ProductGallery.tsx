"use client";
import { useState } from "react";

/** Galeria com miniaturas, zoom por hover (desktop) e tela cheia (toque). */
export function ProductGallery({ images, name, videos }: { images: { src: string; thumb: string; alt: string }[]; name: string; videos: string[] }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [full, setFull] = useState(false);
  if (!images.length) return <div className="flex aspect-square items-center justify-center bg-sand font-serif text-4xl tracking-[0.3em] text-gold/40">LUXER</div>;
  const cur = images[i];
  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row">
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto lg:max-h-[640px] lg:flex-col lg:overflow-y-auto [scrollbar-width:none]">
          {images.map((im, k) => (
            <button key={im.src} onClick={() => setI(k)} aria-label={`Foto ${k + 1}`} className={`h-20 w-20 shrink-0 overflow-hidden bg-sand ring-1 transition ${k === i ? "ring-gold" : "ring-transparent hover:ring-line"}`}>
              <img src={im.thumb} alt="" className="h-full w-full object-cover mix-blend-multiply" />
            </button>
          ))}
        </div>
      )}
      <div className="relative flex-1">
        <div
          className="relative aspect-square cursor-zoom-in overflow-hidden bg-sand"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
          onClick={() => setFull(true)}
        >
          <img src={cur.src} alt={cur.alt || name} className="h-full w-full object-cover mix-blend-multiply transition-transform duration-200" style={zoom ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} fetchPriority="high" />
        </div>
        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.2em] text-stone">Passe o cursor para ampliar · toque para tela cheia</p>
      </div>
      {full && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ivory" onClick={() => setFull(false)}>
          <button className="absolute right-5 top-5 text-2xl" aria-label="Fechar">×</button>
          {images.length > 1 && <button className="absolute left-3 p-4 text-3xl" onClick={(e) => { e.stopPropagation(); setI((i - 1 + images.length) % images.length); }} aria-label="Anterior">‹</button>}
          <img src={cur.src} alt={cur.alt || name} className="max-h-[92vh] max-w-[94vw] object-contain" />
          {images.length > 1 && <button className="absolute right-3 p-4 text-3xl" onClick={(e) => { e.stopPropagation(); setI((i + 1) % images.length); }} aria-label="Próxima">›</button>}
        </div>
      )}
      {videos.length > 0 && <span className="sr-only">{videos.length} vídeo(s) abaixo</span>}
    </div>
  );
}

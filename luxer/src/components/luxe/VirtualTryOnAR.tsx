"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Camera, ImageUp, Info, ShoppingBag, MessageCircle, SlidersHorizontal, SwitchCamera, Loader2, ShieldCheck } from "lucide-react";
import { addToCart } from "@/app/(loja)/_actions/cart";
import { METALS, type Metal } from "./three/metals";
import { ringPose, wristPose, earPoses, neckPose, smoothPose, type Pose, type ARRegion, type P } from "./ar/pose";
import { rolesFor } from "./ar/roles";
import { drawBand, drawPiece, drawChain, preparePieces, refinePieces, findPair, stoneFor, type Adjust, type PieceImg } from "./ar/draw";
import { createTracker, segmentAt, type Tracker } from "./ar/tracker";

export type ARProduct = {
  slug: string; name: string; image: string | null; category: string; color: string | null; stone: string;
  karat: string | null; weightG: string | null; widthMm: number | null; heightMm: number | null; lengthMm: number | null;
  optionName: string | null; variants: { id: string; option: string | null; available: number }[];
};

const PEARL = /p[ée]rola|madrep[ée]rola|n[áa]car/i;
const REGION: Record<string, ARRegion> = { conjuntos: "ear", aneis: "hand", pulseiras: "wrist", brincos: "ear", colares: "neck", correntes: "neck", pingentes: "neck" };
const LABEL: Record<ARRegion, { button: string; where: string; show: string }> = {
  hand: { button: "Provar na mão (AR)", where: "a mão", show: "Mostre o dorso da mão, dedos abertos" },
  wrist: { button: "Provar no pulso (AR)", where: "o pulso", show: "Mostre a mão e o pulso" },
  ear: { button: "Provar na orelha (AR)", where: "a orelha", show: "Vire levemente o rosto, orelha visível" },
  neck: { button: "Provar no colo (AR)", where: "o colo", show: "Rosto e pescoço de frente" },
};
const LOCKED: Record<ARRegion, string> = { hand: "Ajustado ao anelar", wrist: "Ajustado ao pulso", ear: "Ajustado às orelhas", neck: "Ajustado ao colo" };
const metalOf = (c: string | null): Metal => (/branco/i.test(c ?? "") && !/amarel/i.test(c ?? "") ? "branco" : /ros/i.test(c ?? "") && !/amarel/i.test(c ?? "") ? "rose" : "amarelo");
const ADJ0: Adjust = { scale: 1, rotate: 0, light: 1, dx: 0, dy: 0 };

/** Provador AR em tempo real: rastreamento no aparelho (MediaPipe), joia acompanhando a mão, o pulso, a orelha ou o colo. */
/** Peça padrão por uso: brinco → um do par (ou a menor peça compacta); colar → o pingente mais destacado. */
function defaultPiece(r: "ear" | "neck", ps: PieceImg[]) {
  if (!ps.length) return 0;
  if (r === "ear") { const p = findPair(ps); if (p) return p[0]; }
  const compact = ps.map((p, i) => [p, i] as const).filter(([p]) => p.compact);
  if (!compact.length) return 0;
  if (r === "neck") { const necklace = ps.findIndex((p) => !p.compact); if (necklace >= 0) return necklace; }
  return (r === "ear" ? compact.sort((a, b) => a[0].area - b[0].area) : compact.sort((a, b) => b[0].area - a[0].area))[0][1];
}

export function VirtualTryOnModal({ product, whatsapp, sizeGuide, onClose }: { product: ARProduct; whatsapp: string; sizeGuide: boolean; onClose: () => void }) {
  const region = REGION[product.category] ?? "hand";
  const realMetal = metalOf(product.color);
  const [step, setStep] = useState<"privacy" | "live">("privacy");
  const [source, setSource] = useState<"camera" | "photo">("camera");
  const [facing, setFacing] = useState<"user" | "environment">(region === "hand" || region === "wrist" ? "environment" : "user");
  const [tracking, setTracking] = useState<"loading" | "ready" | "manual">("loading");
  const [found, setFound] = useState(false);
  const [photoMiss, setPhotoMiss] = useState(false);
  const [metal, setMetal] = useState<Metal>(realMetal);
  const [adj, setAdj] = useState<Adjust>(ADJ0);
  const [panel, setPanel] = useState<null | "adjust" | "info">(null);
  const [variant, setVariant] = useState<string | null>(product.variants.length === 1 && !product.variants[0].option ? product.variants[0].id : null);
  const [msg, setMsg] = useState<string | null>(null);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const video = useRef<HTMLVideoElement>(null);
  const still = useRef<HTMLImageElement | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const tracker = useRef<Tracker | null>(null);
  const pose = useRef<Pose | null>(null);
  // peças isoladas da foto do catálogo (alfa real); escolha da peça e do uso (brinco ou colar)
  const [pieces, setPieces] = useState<PieceImg[]>([]);
  const [pieceIdx, setPieceIdx] = useState(0);
  const [role, setRole] = useState<"ear" | "neck" | "hand">(region === "neck" ? "neck" : "ear");
  // região efetiva: em brincos/colares/conjuntos, o cliente escolhe o uso da peça
  const eff: ARRegion = region === "ear" || region === "neck" ? role : region;
  const isSet = product.category === "conjuntos";
  const roles = useMemo(() => rolesFor(region, isSet, product.name, pieces), [region, isSet, product.name, pieces]);
  const poseR = useRef<Pose | null>(null);
  const sceneLight = useRef(1);
  const live = useRef({ metal, adj, pieces, pieceIdx, role });
  live.current = { metal, adj, pieces, pieceIdx, role };
  const fileRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; }, []);
  useEffect(() => () => { stopCamera(); tracker.current?.close(); }, [stopCamera]);

  // foto real da peça para brincos e colares: fundo removido (alfa real) e peças separadas
  useEffect(() => {
    if (region === "hand" || region === "wrist" || !product.image) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    let alive = true;
    img.onload = () => {
      let n = 0;
      const pearl = PEARL.test(`${product.name} ${product.stone}`);
      try {
        const ps = preparePieces(img, pearl);
        n = ps.length;
        setPieces(ps);
        setPieceIdx(defaultPiece(region === "neck" ? "neck" : "ear", ps));
      } catch { setPieces([]); }
      // pérola branca em fundo branco: a cor não separa — refino com o segmentador no aparelho (se carregar)
      if (!pearl) return;
      const timeout = new Promise<null>((ok) => setTimeout(() => ok(null), 15000));
      Promise.race([refinePieces(img, segmentAt), timeout]).then((ps) => {
        if (!alive || !ps?.length) return;
        setPieces(ps);
        if (ps.length !== n) setPieceIdx(defaultPiece(region === "neck" ? "neck" : "ear", ps));
      }).catch((e) => console.warn("[ar] refino de pérolas indisponível; mantida a extração por cor", e));
    };
    img.src = product.image;
    return () => { alive = false; };
  }, [product.image, product.name, product.stone, region]);

  async function loadTracker(r: ARRegion = eff) {
    setTracking("loading");
    try {
      tracker.current = await createTracker(r);
      setTracking("ready");
    } catch (e) {
      console.warn("[ar] rastreamento indisponível", e);
      setTracking("manual"); // sem rastreamento: ajuste manual (arrastar, escala, rotação)
    }
  }

  /** Troca o uso da peça; entre rosto e mão, troca também o modelo de rastreamento. */
  function chooseRole(r: "ear" | "neck" | "hand") {
    if (r === role) return;
    const family = (x: string) => (x === "hand" ? "hand" : "face");
    setRole(r); setPhotoMiss(false); pose.current = null; poseR.current = null;
    if (r !== "hand") setPieceIdx(defaultPiece(r, pieces));
    if (family(r) !== family(role)) {
      tracker.current?.close(); tracker.current = null;
      if (r === "hand" && source === "camera") { setFacing("environment"); openCamera("environment"); }
      if (step === "live") loadTracker(r === "hand" ? "hand" : "ear");
    }
  }

  async function openCamera(face = facing) {
    setCamErr(null);
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) { setCamErr("Este navegador não permite usar a câmera. Use uma foto da galeria."); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: face }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      stream.current = s;
      still.current = null;
      setSource("camera"); setStep("live"); pose.current = null;
      requestAnimationFrame(() => { if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); } });
      if (!tracker.current) loadTracker();
    } catch {
      setCamErr("Não conseguimos acessar a câmera. Verifique a permissão do navegador ou use uma foto da galeria.");
    }
  }
  function openPhoto(f: File) {
    stopCamera();
    const img = new Image();
    img.onload = () => { still.current = img; pose.current = null; setPhotoMiss(false); setSource("photo"); setStep("live"); if (!tracker.current) loadTracker(); };
    img.src = URL.createObjectURL(f);
  }

  // laço de renderização: detecta, suaviza (lerp) e desenha a joia sobre o quadro
  useEffect(() => {
    if (step !== "live") return;
    let raf = 0, lastT = -1, lastFound = false, photoDetected = false, n = 0;
    const probe = document.createElement("canvas");
    probe.width = 24; probe.height = 24;
    const pctx = probe.getContext("2d", { willReadFrequently: true })!;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const cv = canvas.current;
      const src = source === "camera" ? video.current : still.current;
      if (!cv || !src) return;
      const w = source === "camera" ? (src as HTMLVideoElement).videoWidth : (src as HTMLImageElement).naturalWidth;
      const h = source === "camera" ? (src as HTMLVideoElement).videoHeight : (src as HTMLImageElement).naturalHeight;
      if (!w || !h) return;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const ctx = cv.getContext("2d")!;
      const { metal: mt, adj: a, pieces: ps, pieceIdx: pi, role: rl } = live.current;
      const er: ARRegion = region === "ear" || region === "neck" ? rl : region;
      const face = er === "ear" || er === "neck";
      // luz da cena (a cada ~15 quadros): a joia acompanha a exposição da câmera
      if (n++ % 15 === 0) {
        try {
          pctx.drawImage(src, 0, 0, 24, 24);
          const d = pctx.getImageData(0, 0, 24, 24).data;
          let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
          sceneLight.current = Math.min(1.15, Math.max(0.72, 0.62 + (sum / 576 / 255) * 0.75));
        } catch { /* sem leitura de pixels: mantém a luz anterior */ }
      }
      let next: Pose | null = null, nextR: Pose | null = null;
      const tr = tracker.current;
      const t = source === "camera" ? (src as HTMLVideoElement).currentTime : 0;
      if (tr && (source === "camera" ? t !== lastT : !photoDetected)) {
        lastT = t; photoDetected = true;
        try {
          const lm: P[] | null = tr.detect(src, performance.now());
          if (lm) {
            if (er === "hand") next = ringPose(lm, w, h);
            else if (er === "wrist") next = wristPose(lm, w, h);
            else if (rl === "ear") { const e = earPoses(lm, w, h); next = e.left; nextR = e.right; }
            else next = neckPose(lm, w, h);
          } else if (source === "photo") setPhotoMiss(true); // foto sem a região: o cliente posiciona a joia à mão
          else { if (pose.current) pose.current = { ...pose.current, visible: false }; if (poseR.current) poseR.current = { ...poseR.current, visible: false }; }
        } catch { /* quadro inválido: mantém a última pose */ }
      }
      if ((!tr || (source === "photo" && photoDetected && !next)) && !pose.current) {
        // modo manual: joia no centro, o cliente ajusta
        const base = face ? Math.min(w, h) * 0.5 : Math.min(w, h) * 0.16;
        pose.current = { x: w / 2, y: h / 2, size: base, angle: face ? 0 : -Math.PI / 2, visible: true };
      }
      const alpha = source === "camera" ? 0.35 : 1;
      if (next) pose.current = smoothPose(pose.current, next, alpha);
      if (nextR) poseR.current = smoothPose(poseR.current, nextR, alpha);
      const f = Boolean(pose.current?.visible || (rl === "ear" && poseR.current?.visible));
      if (f !== lastFound) { lastFound = f; setFound(f); }
      ctx.clearRect(0, 0, w, h);
      const light = sceneLight.current * a.light;
      const rot = (a.rotate * Math.PI) / 180;
      if (er === "hand" && pose.current?.visible) drawBand(ctx, pose.current, mt, { ...a, light }, "ring", stoneFor(product.stone));
      else if (er === "wrist" && pose.current?.visible) drawBand(ctx, pose.current, mt, { ...a, light }, "bracelet", null);
      else if (face && pose.current) {
        const px = (p: Pose) => p.size / 140; // px por mm (largura do rosto ≈ 14 cm)
        if (rl === "ear") {
          // brincos: o par detectado (as duas peças mais parecidas) ou a peça escolhida, espelhada na outra orelha
          const pr0 = findPair(ps);
          const pair = pr0 && pr0.includes(pi) ? pr0 : null;
          const [pl, pr] = pair ? pair.map((k) => ps[k]).sort((x, y) => x.cx - y.cx) : [ps[pi], ps[pi]];
          for (const [p, piece, mirror] of [[pose.current, pl, false], [poseR.current, pr, !pair]] as const) {
            if (!p?.visible || !piece) continue;
            const drop = piece.aspect > 1.3;
            const mm = product.heightMm ?? (drop ? 24 : 9);
            drawPiece(ctx, piece, p.x + a.dx, p.y + a.dy, mm * px(p) * a.scale, p.angle + rot, light, drop ? "top" : "center", mirror);
          }
        } else if (pose.current.visible) {
          const p = pose.current, piece = ps[pi];
          if (!piece || !piece.compact) {
            // corrente/colar fotografado estendido: desenhado contornando o pescoço no tom do metal
            // (a foto de uma corrente estendida não se "veste" — colá-la sobre a pele seria falso)
            // largura real da corrente (mm), limitada ao plausível para corrente de pescoço
            const chainW = Math.max(1.2, Math.min(6, product.widthMm ?? 1.5) * px(p));
            drawChain(ctx, { ...p, x: p.x + a.dx, y: p.y + a.dy, angle: p.angle + rot, size: p.size * a.scale }, mt, chainW, light, p.size * 0.1);
          } else {
            // pingente: foto real da peça (alfa real) pendurada numa corrente fina
            drawChain(ctx, { ...p, x: p.x + a.dx, y: p.y + a.dy, angle: p.angle + rot }, mt, Math.max(1, 0.9 * px(p)), light, p.size * 0.1);
            const top = { x: p.x + a.dx + Math.sin(-p.angle) * p.size * 0.1, y: p.y + a.dy + Math.cos(p.angle) * p.size * 0.1 };
            drawPiece(ctx, piece, top.x, top.y, (product.heightMm ?? 22) * px(p) * a.scale, p.angle + rot, light, "top");
          }
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [step, source, region, product.stone, product.heightMm, product.widthMm, product.category]);

  // arrastar a joia (ajuste fino ou modo manual)
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvas.current!;
    if (e.type === "pointerdown") { drag.current = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); return; }
    if (e.type === "pointerup" || e.type === "pointercancel") { drag.current = null; return; }
    if (!drag.current) return;
    const r = cv.getBoundingClientRect(), k = Math.max(cv.width / r.width, cv.height / r.height);
    const mirror = source === "camera" && facing === "user" ? -1 : 1;
    const dx = (e.clientX - drag.current.x) * k * mirror, dy = (e.clientY - drag.current.y) * k;
    drag.current = { x: e.clientX, y: e.clientY };
    setAdj((a) => ({ ...a, dx: a.dx + dx, dy: a.dy + dy }));
  };

  function capture() {
    const cv = canvas.current, src = source === "camera" ? video.current : still.current;
    if (!cv || !src) return;
    const out = document.createElement("canvas");
    out.width = cv.width; out.height = cv.height;
    const o = out.getContext("2d")!;
    if (source === "camera" && facing === "user") { o.translate(out.width, 0); o.scale(-1, 1); }
    o.drawImage(src, 0, 0, out.width, out.height);
    o.drawImage(cv, 0, 0);
    out.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = `luxer-${product.slug.slice(0, 40)}.jpg`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, "image/jpeg", 0.92);
  }

  const v = product.variants.find((x) => x.id === variant);
  const hasOptions = product.variants.some((x) => x.option);
  const soldOut = product.variants.every((x) => x.available <= 0);
  function buy() {
    if (!variant) { setPanel("info"); setMsg(`Escolha ${product.optionName ? `o ${product.optionName.toLowerCase()}` : "uma opção"} para continuar.`); return; }
    start(async () => {
      const r = await addToCart(variant, 1);
      if (r.ok) { stopCamera(); router.push("/carrinho"); } else setMsg(r.message);
    });
  }
  const waText = `Olá! Estou provando a joia "${product.name}"${v?.option ? ` (${product.optionName ?? "opção"} ${v.option})` : ""} no provador virtual da Luxer. Pode me ajudar?`;
  const wa = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(waText)}` : null;
  const mirror = source === "camera" && facing === "user";
  const pill = "flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3.5 py-2 text-[12px] tracking-tight text-white backdrop-blur-md";

  return (
    <div className="theme-obsidian fixed inset-0 z-[90] flex items-stretch justify-center !bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Provador virtual AR" onClick={() => { stopCamera(); onClose(); }}>
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#050505] text-[#f5f5f7] sm:h-[min(92vh,900px)] sm:max-w-[520px] sm:rounded-[28px] sm:border sm:border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => { stopCamera(); onClose(); }} className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md" aria-label="Fechar provador"><X className="h-5 w-5" strokeWidth={1.25} /></button>

        {step === "privacy" && (
          <div className="flex flex-1 flex-col justify-end px-7 pb-9 pt-16">
            <div className="flex flex-1 items-center justify-center">
              {pieces[0] ? <img src={pieces[0].thumb} alt="" className="h-44 w-44 object-contain drop-shadow-[0_20px_40px_rgba(212,175,55,0.18)]" />
                : <div aria-hidden className="h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.16),transparent_65%)]" />}
            </div>
            <div className="text-[10px] uppercase tracking-[0.4em] text-[#d4af37]">Provador virtual · AR</div>
            <h2 className="mt-3 font-serif text-[2rem] leading-[1.08] tracking-tight">{product.name}</h2>
            <div className="mt-6 flex gap-3 rounded-2xl border border-white/[0.08] bg-[#0e0e10] p-4 text-[13px] leading-relaxed tracking-tight text-[#86868b]">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af37]" strokeWidth={1.25} />
              <p>A câmera é processada <b className="font-medium text-[#f5f5f7]">no seu aparelho</b>, em tempo real. Nenhuma imagem é enviada ou armazenada.</p>
            </div>
            <button type="button" onClick={() => openCamera()} className="mt-6 flex items-center justify-center gap-2 rounded-full bg-[#f5f5f7] py-4 text-[14px] font-medium tracking-tight text-[#050505]"><Camera className="h-5 w-5" strokeWidth={1.25} />Concordar e abrir câmera</button>
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-3 flex items-center justify-center gap-2 rounded-full border border-white/15 py-4 text-[14px] tracking-tight"><ImageUp className="h-5 w-5" strokeWidth={1.25} />Usar foto da galeria</button>
            {camErr && <p role="alert" className="mt-4 text-center text-[12px] text-red-400">{camErr}</p>}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Escolher foto" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) openPhoto(f); }} />

        {step === "live" && (
          <>
            <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
              <div className={`absolute inset-0 ${mirror ? "-scale-x-100" : ""}`}>
                {source === "camera" ? <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-cover" /> : still.current && <img src={still.current.src} alt="Sua foto" className="absolute inset-0 h-full w-full object-cover" />}
                <canvas ref={canvas} onPointerDown={onPointer} onPointerMove={onPointer} onPointerUp={onPointer} onPointerCancel={onPointer} className="absolute inset-0 h-full w-full touch-none object-cover" aria-label="Joia sobreposta — arraste para ajustar" />
              </div>
              {/* topo: estado do rastreamento + medida + metal */}
              <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-3 pr-12">
                {/* status real do rastreamento: só "Rastreando…" enquanto busca; ao travar, um indicador discreto */}
                {tracking === "ready" && found && !(photoMiss && source === "photo") ? (
                  <div className="flex items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 text-[11px] tracking-tight text-white/85 backdrop-blur-md" aria-live="polite">
                    <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d4af37] opacity-40" /><span className="relative h-2 w-2 rounded-full bg-[#d4af37]" /></span>
                    {LOCKED[eff]}
                  </div>
                ) : (
                  <div className={pill} aria-live="polite">
                    {tracking === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.25} />Carregando rastreamento…</>
                      : tracking === "manual" ? <>Ajuste manual: arraste a joia</>
                      : photoMiss && source === "photo" ? <>Não encontramos {LABEL[eff].where}: arraste a joia</>
                      : <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.25} />Rastreando… {LABEL[eff].show.toLowerCase()}</>}
                  </div>
                )}
              </div>
              <div className="absolute right-4 top-16 flex flex-col items-end gap-2">
                {region === "hand" && <button type="button" onClick={() => setPanel("info")} className={pill}>{v?.option ? `${product.optionName ?? "Aro"} ${v.option}` : `Escolher ${(product.optionName ?? "aro").toLowerCase()}`}</button>}
                <div className="flex gap-1.5 rounded-full border border-white/10 bg-black/45 p-1.5 backdrop-blur-md" role="radiogroup" aria-label="Metal">
                  {(["amarelo", "branco", "rose"] as Metal[]).map((m) => <button key={m} type="button" role="radio" aria-checked={metal === m} aria-label={METALS[m].label} onClick={() => setMetal(m)} className={`h-7 w-7 rounded-full ${metal === m ? "ring-2 ring-white ring-offset-2 ring-offset-black" : ""}`} style={{ background: METALS[m].swatch }} />)}
                </div>
                {metal !== realMetal && <div className={`${pill} max-w-[220px] text-[11px]`}>Esta peça é feita em {METALS[realMetal].short.toLowerCase()}. Outros acabamentos sob consulta.</div>}
              </div>
              {source === "camera" && <button type="button" onClick={() => { const f = facing === "user" ? "environment" : "user"; setFacing(f); openCamera(f); }} className={`${pill} absolute bottom-4 left-4`} aria-label="Trocar câmera"><SwitchCamera className="h-4 w-4" strokeWidth={1.25} /></button>}
              <button type="button" onClick={() => setPanel(panel === "adjust" ? null : "adjust")} className={`${pill} absolute bottom-4 right-4`} aria-expanded={panel === "adjust"}><SlidersHorizontal className="h-4 w-4" strokeWidth={1.25} />Ajustar</button>

              <AnimatePresence>
                {panel && (
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}
                    className="absolute inset-x-0 bottom-0 z-10 max-h-[70%] overflow-y-auto rounded-t-[24px] border-t border-white/[0.08] bg-[#0e0e10]/95 px-6 pb-6 pt-4 backdrop-blur-xl">
                    <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
                    {panel === "adjust" ? (
                      <div className="space-y-5 text-[12px] tracking-tight">
                        {([["scale", "Tamanho", 0.5, 1.8, 0.01], ["rotate", "Rotação", -45, 45, 1], ["light", "Luz", 0.6, 1.5, 0.01]] as const).map(([k, l, min, max, st]) => (
                          <label key={k} className="block"><span className="mb-2 flex justify-between text-[#86868b]"><span>{l}</span><span className="tabular-nums text-[#f5f5f7]">{k === "rotate" ? `${adj[k]}°` : `${Math.round(adj[k] * 100)}%`}</span></span>
                            <input type="range" min={min} max={max} step={st} value={adj[k]} onChange={(e) => setAdj({ ...adj, [k]: Number(e.target.value) })} className="w-full accent-[#d4af37]" /></label>
                        ))}
                        {/* posição fina (em % do quadro); arrastar a joia na tela também funciona */}
                        {([["dx", "Posição horizontal", canvas.current?.width ?? 1], ["dy", "Posição vertical", canvas.current?.height ?? 1]] as const).map(([k, l, size]) => (
                          <label key={k} className="block"><span className="mb-2 flex justify-between text-[#86868b]"><span>{l}</span><span className="tabular-nums text-[#f5f5f7]">{((adj[k] / size) * 100).toFixed(1)}%</span></span>
                            <input type="range" min={-0.2} max={0.2} step={0.002} value={adj[k] / size} onChange={(e) => setAdj({ ...adj, [k]: Number(e.target.value) * size })} className="w-full accent-[#d4af37]" /></label>
                        ))}
                        <button type="button" onClick={() => setAdj(ADJ0)} className="text-[#86868b] underline underline-offset-4">Restaurar ajustes</button>
                      </div>
                    ) : (
                      <div className="text-[13px] tracking-tight">
                        <div className="font-serif text-xl">{product.name}</div>
                        <dl className="mt-4 divide-y divide-white/[0.08] border-y border-white/[0.08]">
                          {product.karat && <div className="flex justify-between py-2.5"><dt className="text-[#86868b]">Quilates</dt><dd>{product.karat}</dd></div>}
                          {product.weightG && <div className="flex justify-between py-2.5"><dt className="text-[#86868b]">Peso médio</dt><dd>{product.weightG} g</dd></div>}
                          {product.widthMm && <div className="flex justify-between py-2.5"><dt className="text-[#86868b]">Largura</dt><dd>{product.widthMm} mm</dd></div>}
                          {product.heightMm && <div className="flex justify-between py-2.5"><dt className="text-[#86868b]">Altura</dt><dd>{product.heightMm} mm</dd></div>}
                          {product.lengthMm && <div className="flex justify-between py-2.5"><dt className="text-[#86868b]">Comprimento</dt><dd>{product.lengthMm} mm</dd></div>}
                          <div className="flex justify-between py-2.5"><dt className="text-[#86868b]">Metal</dt><dd>{METALS[realMetal].label}</dd></div>
                        </dl>
                        {hasOptions && (
                          <div className="mt-5">
                            <div className="mb-2 text-[#86868b]">{product.optionName ?? "Opção"}</div>
                            <div className="flex flex-wrap gap-2">{product.variants.map((x) => <button key={x.id} type="button" disabled={x.available <= 0} onClick={() => { setVariant(x.id); setMsg(null); }} aria-pressed={variant === x.id} className={`h-10 min-w-10 rounded-full border px-3 tabular-nums ${variant === x.id ? "border-[#f5f5f7] bg-[#f5f5f7] text-[#050505]" : "border-white/15"} disabled:opacity-30 disabled:line-through`}>{x.option}</button>)}</div>
                            {sizeGuide && region === "hand" && <Link href="/p/guia-de-tamanhos" target="_blank" className="mt-3 inline-block text-[#86868b] underline underline-offset-4">Guia de aros</Link>}
                          </div>
                        )}
                        <p className="mt-4 text-[11px] leading-relaxed text-[#86868b]">{region === "hand" || region === "wrist" ? "Prova em AR: aro desenhado no acabamento da peça, em escala aproximada. O desenho exato está nas fotos da página." : "Prova em AR com a fotografia da peça, em escala aproximada."} A medida do aro não é estimada pela câmera — consulte o guia ou um especialista.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* barra inferior fixa */}
            <div className="border-t border-white/[0.08] bg-[#050505] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              {(region === "ear" || region === "neck") && pieces.length > 0 && (
                <div className="mb-4 flex items-center gap-3 overflow-x-auto [scrollbar-width:none]">
                  {/* peças isoladas da fotografia (par de brincos, colar + brincos de um conjunto) */}
                  <div role="radiogroup" aria-label="Peça" className={`flex shrink-0 gap-2 ${role === "hand" ? "hidden" : ""}`}>
                    {pieces.map((p, i) => (
                      <button key={i} type="button" role="radio" aria-checked={pieceIdx === i} aria-label={`Peça ${i + 1}`} onClick={() => setPieceIdx(i)}
                        className={`h-12 w-12 shrink-0 rounded-xl border bg-[#0e0e10] p-1 transition-colors ${pieceIdx === i ? "border-[#d4af37]" : "border-white/10"}`}>
                        <img src={p.thumb} alt="" className="h-full w-full object-contain" />
                      </button>
                    ))}
                  </div>
                  {roles.length > 1 && (
                    <div role="radiogroup" aria-label="Usar como" className="ml-auto flex shrink-0 rounded-full border border-white/10 p-1 text-[11px] tracking-tight">
                      {roles.map((r) => (
                        <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => chooseRole(r)}
                          className={`rounded-full px-3 py-1.5 ${role === r ? "bg-[#f5f5f7] text-[#050505]" : "text-[#86868b]"}`}>{r === "ear" ? "Brinco" : r === "neck" ? "Colar" : "Anel"}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {msg && <p role="status" className="mb-3 text-center text-[12px] text-[#d4af37]">{msg}</p>}
              <div className="flex items-center gap-3">
                <button type="button" onClick={capture} aria-label="Capturar foto" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15"><Camera className="h-5 w-5" strokeWidth={1.25} /></button>
                <button type="button" onClick={() => setPanel(panel === "info" ? null : "info")} aria-label="Informações e medidas" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15"><Info className="h-5 w-5" strokeWidth={1.25} /></button>
                <button type="button" onClick={buy} disabled={pending || soldOut} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#f5f5f7] text-[14px] font-medium tracking-tight text-[#050505] disabled:opacity-40"><ShoppingBag className="h-5 w-5" strokeWidth={1.25} />{soldOut ? "Esgotado" : pending ? "Adicionando…" : "Comprar agora"}</button>
              </div>
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 text-[12px] tracking-tight text-[#86868b] hover:text-[#f5f5f7]"><MessageCircle className="h-4 w-4" strokeWidth={1.25} />Consultar Especialista LUXER no WhatsApp</a>}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

/** Botão "Provar na mão / pulso (AR)" — na página do produto e na vitrine (abre sozinho com ?ar=1). */
export function ARButton({ product, whatsapp, sizeGuide = false, className = "" }: { product: ARProduct; whatsapp: string; sizeGuide?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const region = REGION[product.category] ?? "hand";
  useEffect(() => { if (new URLSearchParams(window.location.search).get("ar") === "1") setOpen(true); }, []);
  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => { document.documentElement.style.overflow = ""; window.removeEventListener("keydown", k); };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`group flex w-full items-center justify-between gap-4 rounded-2xl border border-white/[0.1] bg-[#0e0e10] px-5 py-4 text-left transition-colors hover:border-[#d4af37]/60 ${className}`}>
        <span className="flex items-center gap-4">
          <Camera className="h-5 w-5 text-[#d4af37]" strokeWidth={1.25} />
          <span><span className="block text-[14px] font-medium tracking-tight text-[#f5f5f7]">{product.category === "conjuntos" ? "Provar o conjunto (AR)" : LABEL[region].button}</span><span className="mt-0.5 block text-[12px] tracking-tight text-[#86868b]">Em tempo real, pela câmera, no seu aparelho</span></span>
        </span>
        <span aria-hidden className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37]">Ao vivo</span>
      </button>
      {open && createPortal(<VirtualTryOnModal product={product} whatsapp={whatsapp} sizeGuide={sizeGuide} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

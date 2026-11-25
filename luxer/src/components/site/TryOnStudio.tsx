"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/(loja)/_actions/cart";

export type StudioProduct = {
  slug: string; name: string; image: string | null; category: string;
  optionName: string | null; variants: { id: string; option: string | null; available: number }[];
};
type Region = "hand" | "ear" | "neck" | "wrist";
const REGION: Record<string, Region> = { aneis: "hand", brincos: "ear", colares: "neck", correntes: "neck", pingentes: "neck", pulseiras: "wrist" };

const GUIDE: Record<Region, { title: string; where: string; tips: string[]; facing: "user" | "environment" }> = {
  hand: { title: "Fotografe sua mão", where: "a mão", facing: "environment", tips: ["Mão aberta, dedos levemente afastados", "Dorso da mão voltado para a câmera", "Luz natural, sem anéis no dedo escolhido"] },
  ear: { title: "Fotografe sua orelha", where: "a orelha", facing: "user", tips: ["Rosto de perfil ou levemente virado", "Cabelo preso, orelha totalmente visível", "Luz suave vinda da frente"] },
  neck: { title: "Fotografe pescoço e colo", where: "o pescoço e o colo", facing: "user", tips: ["De frente, do queixo até o peito", "Decote ou gola aberta, sem colares", "Ombros relaxados e luz uniforme"] },
  wrist: { title: "Fotografe seu pulso", where: "o pulso", facing: "environment", tips: ["Mão e antebraço, pulso no centro", "Sem relógio, pulseiras ou mangas", "Apoie o braço para a foto ficar nítida"] },
};

/** Silhuetas de enquadramento (traço fino) exibidas sobre a câmera e nas orientações. */
function Silhouette({ region, className = "" }: { region: Region; className?: string }) {
  const d: Record<Region, string> = {
    hand: "M70 190 C60 160 58 130 62 110 L50 60 C47 48 62 44 66 56 L78 100 L76 40 C75 27 92 27 93 40 L96 98 L100 32 C101 19 118 20 117 33 L114 99 L122 46 C124 34 140 37 138 50 L130 110 L146 86 C153 76 166 84 160 96 L132 156 C124 176 118 190 116 200 Z",
    ear: "M110 40 C80 40 64 64 66 92 C68 110 78 118 80 132 C82 150 76 160 86 172 C96 184 114 180 118 166 C122 154 116 146 126 132 C140 112 146 92 140 70 C134 50 124 40 110 40 Z M104 76 C96 76 92 86 98 94 C104 102 102 112 96 118",
    neck: "M62 30 C62 70 84 92 100 92 C116 92 138 70 138 30 M86 92 L84 128 C60 134 30 140 18 160 L18 200 M114 92 L116 128 C140 134 170 140 182 160 L182 200 M70 150 C86 170 114 170 130 150",
    wrist: "M40 200 L60 120 C64 104 70 96 80 92 L86 50 C87 40 100 40 100 50 L100 88 L108 46 C110 36 123 38 122 48 L116 92 C130 96 140 108 140 124 L150 200 M56 150 L146 150",
  };
  return <svg viewBox="0 0 200 220" className={className} fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d[region]} /></svg>;
}

type Checks = { width: number; height: number; light: "ok" | "dark" | "bright"; sharp: boolean; tooSmall: boolean };

/** Verificação local (no aparelho) antes de enviar: resolução, exposição e nitidez (variância do Laplaciano). */
async function inspect(blob: Blob): Promise<Checks> {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!; ctx.drawImage(bmp, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) { g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]; sum += g[i]; }
  const mean = sum / (w * h);
  let m = 0, m2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
    m += l; m2 += l * l; n++;
  }
  const variance = n ? m2 / n - (m / n) ** 2 : 0;
  return { width: bmp.width, height: bmp.height, light: mean < 55 ? "dark" : mean > 215 ? "bright" : "ok", sharp: variance > 40, tooSmall: Math.min(bmp.width, bmp.height) < 480 };
}

async function normalizePhoto(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/jpeg", 0.92));
}

const STAGES: { key: string; label: (r: Region) => string }[] = [
  { key: "detect", label: (r) => `Localizando ${GUIDE[r].where}` },
  { key: "profile", label: () => "Estudando cada detalhe da peça" },
  { key: "generate", label: () => "Aplicando a joia" },
  { key: "composite", label: () => "Integrando luz, sombra e perspectiva" },
  { key: "verify", label: () => "Verificando fidelidade à peça original" },
];

type Job = { id: string; token: string };
type Status = { status: string; stage: string; generations: number; target: number[] | null; fidelity: number | null; expiresAt: string | null; error: string | null; retryable: boolean; disclaimer: string };

export function TryOnStudio({ product, consentText, onClose }: { product: StudioProduct; consentText: string; onClose?: () => void }) {
  const region = REGION[product.category] ?? "hand";
  const guide = GUIDE[region];
  const [step, setStep] = useState<"intro" | "camera" | "review" | "processing" | "result" | "error">("intro");
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string; checks: Checks } | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [st, setSt] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">(guide.facing);
  const [split, setSplit] = useState(50);
  const [detail, setDetail] = useState(false);
  const [variant, setVariant] = useState<string | null>(product.variants.length === 1 && !product.variants[0].option ? product.variants[0].id : null);
  const [cartMsg, setCartMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [pending, start] = useTransition();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const stopCamera = useCallback(() => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; }, []);
  useEffect(() => () => { stopCamera(); }, [stopCamera]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  async function openCamera(face = facing) {
    setCamErr(null);
    if (!navigator.mediaDevices?.getUserMedia) { setCamErr("Este navegador não permite usar a câmera aqui. Escolha uma foto da galeria."); return; }
    stopCamera();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: face }, width: { ideal: 1920 }, height: { ideal: 1920 } }, audio: false });
      stream.current = s;
      setStep("camera");
      requestAnimationFrame(() => { if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); } });
    } catch {
      setCamErr("Não conseguimos acessar a câmera. Verifique a permissão do navegador ou escolha uma foto da galeria.");
    }
  }

  async function usePhoto(blob: Blob) {
    try {
      const checks = await inspect(blob);
      setPhoto({ blob, url: URL.createObjectURL(blob), checks });
      setError(null);
      setStep("review");
    } catch {
      setError("Não foi possível ler esta imagem. Use JPG, PNG ou WebP.");
    }
  }

  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    if (facing === "user") { ctx.translate(c.width, 0); ctx.scale(-1, 1); } // grava como o cliente vê (espelhado)
    ctx.drawImage(v, 0, 0);
    stopCamera();
    c.toBlob((b) => b && usePhoto(b), "image/jpeg", 0.93);
  }

  async function submit() {
    if (!photo || !consent) return;
    setError(null); setSt(null); setDeleted(false); setCartMsg(null); setSplit(50); setDetail(false);
    setStep("processing");
    const fd = new FormData();
    fd.set("photo", await normalizePhoto(photo.blob).catch(() => photo.blob), "foto.jpg");
    fd.set("product", product.slug);
    fd.set("consent", "true");
    const r = await fetch("/api/tryon", { method: "POST", body: fd }).then((x) => x.json()).catch(() => ({ ok: false, error: "Falha de conexão. Verifique sua internet." }));
    if (!r.ok) { setError(r.error); setStep("error"); return; }
    setJob({ id: r.id, token: r.token });
  }

  // acompanhamento do processamento real (etapas reportadas pelo servidor)
  useEffect(() => {
    if (!job || step !== "processing") return;
    let stop = false;
    const tick = async () => {
      const r: Status & { ok: boolean } = await fetch(`/api/tryon/${job.id}?t=${encodeURIComponent(job.token)}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
      if (stop) return;
      if (r?.ok) {
        setSt(r);
        if (r.status === "SUCCEEDED") { setStep("result"); return; }
        if (r.status === "FAILED" || r.status === "BLOCKED") { setError(r.error); setStep("error"); return; }
      }
      setTimeout(tick, 1400);
    };
    tick();
    return () => { stop = true; };
  }, [job, step]);

  const resultUrl = job ? `/api/tryon/${job.id}/imagem?t=${encodeURIComponent(job.token)}` : "";
  const box = st?.target;
  const origin = box ? `${((box[1] + box[3]) / 20).toFixed(1)}% ${((box[0] + box[2]) / 20).toFixed(1)}%` : "50% 50%";
  const hasOptions = product.variants.some((v) => v.option);

  function addBag() {
    if (!variant) { setCartMsg({ ok: false, text: `Escolha ${product.optionName ? `o ${product.optionName.toLowerCase()}` : "uma opção"}.` }); return; }
    start(async () => {
      const r = await addToCart(variant, 1);
      setCartMsg({ ok: r.ok, text: r.message });
      if (r.ok) router.refresh();
    });
  }
  async function deleteNow() {
    if (!job) return;
    await fetch(`/api/tryon/${job.id}?t=${encodeURIComponent(job.token)}`, { method: "DELETE" }).catch(() => {});
    setDeleted(true);
  }
  const minutesLeft = st?.expiresAt ? Math.max(1, Math.round((new Date(st.expiresAt).getTime() - Date.now()) / 60000)) : null;

  const Header = (
    <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-4">
        {product.image && <img src={product.image} alt="" className="h-11 w-11 shrink-0 bg-white object-contain p-0.5" />}
        <div className="min-w-0">
          <div className="text-[9.5px] uppercase tracking-[0.3em] text-gold-2">Luxer AI · Provador</div>
          <div className="truncate font-serif text-[1.05rem]">{product.name}</div>
        </div>
      </div>
      {onClose && <button type="button" onClick={() => { stopCamera(); onClose(); }} className="-mr-2 p-2 text-xl font-light text-stone hover:text-ink" aria-label="Fechar provador">×</button>}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-ivory text-ink">
      {Header}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {step === "intro" && (
          <div className="grid gap-10 px-5 py-8 sm:px-8 sm:py-10 md:grid-cols-[1fr_1.1fr] md:items-center">
            <div className="relative mx-auto flex aspect-[4/5] w-full max-w-[320px] items-center justify-center bg-white">
              <Silhouette region={region} className="h-[70%] text-ink/70" />
              <span className="absolute inset-x-6 bottom-5 text-center text-[10px] uppercase tracking-[0.24em] text-stone">Enquadramento ideal</span>
            </div>
            <div>
              <h2 className="display text-[2rem] sm:text-[2.4rem]">{guide.title}</h2>
              <ul className="mt-6 space-y-3 text-[14px] text-ink/75">
                {guide.tips.map((t, i) => <li key={t} className="flex gap-4"><span className="w-5 shrink-0 text-[11px] tabular-nums text-gold">0{i + 1}</span>{t}</li>)}
              </ul>
              <label className="mt-8 flex items-start gap-3 text-[12px] leading-relaxed text-ink/70">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[#0b0b0c]" />
                <span>{consentText} <Link href="/privacidade" target="_blank" className="underline underline-offset-2">Privacidade</Link></span>
              </label>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" disabled={!consent} onClick={() => openCamera()} className="btn-gold flex-1">Usar a câmera</button>
                <button type="button" disabled={!consent} onClick={() => fileRef.current?.click()} className="btn-line flex-1">Escolher da galeria</button>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Escolher foto" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) usePhoto(f); }} />
              {!consent && <p className="mt-3 text-[11px] text-stone">Autorize o uso da foto para continuar.</p>}
              {(camErr || error) && <p role="alert" className="mt-4 border-l border-red-700 pl-3 text-[13px] text-red-800">{camErr || error}</p>}
            </div>
          </div>
        )}

        {step === "camera" && (
          <div className="relative mx-auto flex h-full max-h-[78vh] min-h-[420px] w-full items-center justify-center overflow-hidden bg-ink">
            <video ref={video} playsInline muted className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`} />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><Silhouette region={region} className="h-[62%] text-ivory/80 [stroke-dasharray:4_5]" /></div>
            <p className="absolute inset-x-0 top-4 text-center text-[11px] uppercase tracking-[0.24em] text-ivory/85">Posicione {guide.where} dentro do contorno</p>
            <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-10">
              <button type="button" onClick={() => { stopCamera(); setStep("intro"); }} className="text-[10.5px] uppercase tracking-[0.22em] text-ivory/80">Voltar</button>
              <button type="button" onClick={capture} aria-label="Fotografar" className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-ivory/80"><span className="h-[54px] w-[54px] rounded-full bg-ivory" /></button>
              <button type="button" onClick={() => { const f = facing === "user" ? "environment" : "user"; setFacing(f); openCamera(f); }} className="text-[10.5px] uppercase tracking-[0.22em] text-ivory/80">Girar</button>
            </div>
          </div>
        )}

        {step === "review" && photo && (
          <div className="grid gap-8 px-5 py-8 sm:px-8 md:grid-cols-[1.1fr_1fr] md:items-center">
            <div className="flex max-h-[60vh] items-center justify-center bg-white"><img src={photo.url} alt="Sua foto" className="max-h-[60vh] w-auto object-contain" /></div>
            <div>
              <h2 className="display text-[2rem]">Confira sua foto</h2>
              <ul className="mt-6 divide-y divide-line border-y border-line text-[13px]">
                <li className="flex justify-between py-3"><span>Resolução</span><span className={photo.checks.tooSmall ? "text-red-800" : "text-ink/70"}>{photo.checks.width}×{photo.checks.height}{photo.checks.tooSmall ? " · muito baixa" : " · adequada"}</span></li>
                <li className="flex justify-between py-3"><span>Iluminação</span><span className={photo.checks.light === "ok" ? "text-ink/70" : "text-gold-2"}>{photo.checks.light === "ok" ? "adequada" : photo.checks.light === "dark" ? "escura — procure mais luz" : "estourada — evite luz direta"}</span></li>
                <li className="flex justify-between py-3"><span>Nitidez</span><span className={photo.checks.sharp ? "text-ink/70" : "text-gold-2"}>{photo.checks.sharp ? "adequada" : "pode estar tremida"}</span></li>
              </ul>
              <p className="mt-4 text-[12px] text-stone">A LUXER AI ainda confirma se {guide.where} está visível antes de aplicar a joia.</p>
              <div className="sticky bottom-0 -mx-5 mt-8 flex flex-col gap-3 border-t border-line bg-ivory px-5 py-4 sm:static sm:mx-0 sm:flex-row sm:border-0 sm:p-0">
                <button type="button" disabled={photo.checks.tooSmall} onClick={submit} className="btn-gold flex-1">Provar com IA</button>
                <button type="button" onClick={() => setStep("intro")} className="btn-line flex-1">Trocar foto</button>
              </div>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="grid gap-8 px-5 py-8 sm:px-8 md:grid-cols-[1.1fr_1fr] md:items-center">
            <div className="relative mx-auto w-fit max-w-full overflow-hidden bg-white">
              {photo && <img src={photo.url} alt="" className="block max-h-[60vh] w-auto object-contain opacity-80" />}
              {box && <div className="absolute border border-gold transition-all duration-700" style={{ top: `${box[0] / 10}%`, left: `${box[1] / 10}%`, height: `${(box[2] - box[0]) / 10}%`, width: `${(box[3] - box[1]) / 10}%` }}><span className="absolute -top-5 left-0 whitespace-nowrap text-[9px] uppercase tracking-[0.2em] text-gold-2">ponto de aplicação</span></div>}
              <div aria-hidden className="pointer-events-none absolute inset-x-0 h-px animate-[lx-scan_2.4s_ease-in-out_infinite] bg-gold/70" />
            </div>
            <div aria-live="polite">
              <div className="text-[10px] uppercase tracking-[0.3em] text-stone">Processando</div>
              <h2 className="display mt-3 text-[2rem]">Criando sua prova</h2>
              <ol className="mt-7 space-y-4">
                {STAGES.map((s, i) => {
                  const cur = STAGES.findIndex((x) => x.key === st?.stage);
                  const state = cur > i ? "done" : cur === i ? "now" : "next";
                  return (
                    <li key={s.key} className={`flex items-center gap-4 text-[14px] transition-colors ${state === "next" ? "text-stone/60" : "text-ink"}`}>
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${state === "done" ? "bg-ink" : state === "now" ? "animate-pulse bg-gold" : "bg-line"}`} />
                      {s.label(region)}{s.key === "generate" && (st?.generations ?? 0) > 1 && state !== "next" ? " · nova tentativa para máxima fidelidade" : ""}
                    </li>
                  );
                })}
              </ol>
              <p className="mt-8 text-[12px] text-stone">Leva cerca de 20 a 60 segundos. Mantenha esta janela aberta.</p>
            </div>
          </div>
        )}

        {step === "result" && photo && job && (
          <div className="grid gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.35fr_1fr]">
            <div>
              {deleted ? (
                <div className="flex aspect-[4/5] items-center justify-center bg-white px-10 text-center text-[13px] text-stone">Imagens excluídas a seu pedido.</div>
              ) : (
                <div className="relative mx-auto w-fit max-w-full select-none overflow-hidden bg-white" style={{ touchAction: "pan-y" }}>
                  <div className="transition-transform duration-700" style={{ transform: detail ? "scale(2.6)" : "none", transformOrigin: origin }}>
                    <img src={photo.url} alt="Sua foto original" className="block max-h-[66vh] w-auto" draggable={false} />
                    <img src={resultUrl} alt="Simulação da joia em você" className="absolute inset-0 h-full w-full" style={{ clipPath: `inset(0 0 0 ${split}%)` }} draggable={false} />
                  </div>
                  <div aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-ivory shadow-[0_0_0_0.5px_rgba(11,11,12,.25)]" style={{ left: `${split}%` }}><span className="absolute top-1/2 -ml-4 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ivory text-[10px] text-ink">‹ ›</span></div>
                  <span className="absolute left-3 top-3 text-[9px] uppercase tracking-[0.22em] text-ink/70">Antes</span>
                  <span className="absolute right-3 top-3 text-[9px] uppercase tracking-[0.22em] text-ink/70">Com a joia</span>
                  <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label="Comparar antes e depois" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
                </div>
              )}
              {!deleted && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10.5px] uppercase tracking-[0.2em]">
                  <button type="button" onClick={() => setSplit(100)} className={split === 100 ? "text-ink" : "text-stone hover:text-ink"}>Antes</button>
                  <button type="button" onClick={() => setSplit(50)} className={split === 50 ? "text-ink" : "text-stone hover:text-ink"}>Comparar</button>
                  <button type="button" onClick={() => setSplit(0)} className={split === 0 ? "text-ink" : "text-stone hover:text-ink"}>Com a joia</button>
                  {box && <button type="button" onClick={() => setDetail(!detail)} className="text-stone hover:text-ink">{detail ? "Ver inteira" : "Ver detalhe"}</button>}
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-gold-2">Sua prova Luxer AI</div>
              <h2 className="display mt-3 text-[2rem] leading-tight">{product.name}</h2>
              {st?.fidelity != null && <p className="mt-4 flex items-center gap-3 text-[12px] text-ink/70"><span className="h-px w-6 bg-gold" />Fidelidade à peça verificada: {st.fidelity}/100</p>}
              <p className="mt-3 text-[12px] leading-relaxed text-stone">{st?.disclaimer}</p>

              {hasOptions && (
                <fieldset className="mt-8">
                  <legend className="eyebrow mb-3 text-stone">{product.optionName ?? "Opção"}</legend>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => <button key={v.id} type="button" disabled={v.available <= 0} onClick={() => { setVariant(v.id); setCartMsg(null); }} aria-pressed={variant === v.id} className={`h-10 min-w-10 border px-3 text-[13px] tabular-nums transition-colors ${variant === v.id ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:border-ink"} disabled:border-line disabled:bg-transparent disabled:text-stone/45 disabled:line-through`}>{v.option}</button>)}
                  </div>
                </fieldset>
              )}
              <button type="button" onClick={addBag} disabled={pending || product.variants.every((v) => v.available <= 0)} className="btn-gold mt-8 w-full">{product.variants.every((v) => v.available <= 0) ? "Esgotado" : pending ? "Adicionando…" : "Adicionar à sacola"}</button>
              {cartMsg && <p role="status" className={`mt-3 text-[13px] ${cartMsg.ok ? "text-ink" : "text-red-700"}`}>{cartMsg.text} {cartMsg.ok && <Link href="/carrinho" className="underline underline-offset-4">Ver sacola</Link>}</p>}

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button type="button" onClick={submit} className="btn-line !px-3">Gerar novamente</button>
                <button type="button" onClick={() => { setJob(null); setStep("intro"); }} className="btn-line !px-3">Nova foto</button>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-5 text-[11px] text-stone">
                {!deleted && <a href={resultUrl} download className="underline-offset-4 hover:text-ink hover:underline">Salvar imagem</a>}
                {!deleted ? <button type="button" onClick={deleteNow} className="underline-offset-4 hover:text-ink hover:underline">Excluir minhas imagens agora</button> : <span>Imagens excluídas.</span>}
                {!deleted && minutesLeft && <span>Exclusão automática em {minutesLeft} min</span>}
              </div>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="mx-auto max-w-lg px-5 py-14 text-center sm:px-8">
            {photo && <img src={photo.url} alt="" className="mx-auto mb-8 max-h-48 w-auto opacity-70" />}
            <h2 className="display text-[1.9rem]">Vamos tentar outra foto</h2>
            <p role="alert" className="mt-4 text-[14px] leading-relaxed text-ink/75">{error}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => { setJob(null); setStep("intro"); }} className="btn-gold flex-1">Nova foto</button>
              {photo && st?.retryable !== false && <button type="button" onClick={submit} className="btn-line flex-1">Tentar novamente</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Botão "Provar com IA" + modal (tela cheia no celular). Abre sozinho com ?provar=1 na URL. */
export function TryOnButton({ product, consentText, className = "" }: { product: StudioProduct; consentText: string; className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("provar") === "1") setOpen(true); }, []);
  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => { document.documentElement.style.overflow = ""; window.removeEventListener("keydown", k); };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`group flex w-full items-center justify-between border border-ink/80 px-5 py-4 text-left transition-colors hover:bg-ink hover:text-ivory ${className}`}>
        <span>
          <span className="block text-[10.5px] uppercase tracking-[0.26em]">Provar com IA</span>
          <span className="mt-1 block text-[12px] text-stone transition-colors group-hover:text-ivory/70">Veja esta peça em você, com a sua foto</span>
        </span>
        <span aria-hidden className="text-[9px] uppercase tracking-[0.3em] text-gold-2 transition-colors group-hover:text-gold-soft">Luxer AI</span>
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[80] flex animate-[fade-in_.3s_ease] items-stretch justify-center bg-ink/45 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Provador Luxer AI" onClick={() => setOpen(false)}>
          <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-ivory sm:h-[min(90vh,860px)] sm:max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <TryOnStudio product={product} consentText={consentText} onClose={() => setOpen(false)} />
          </div>
        </div>,
        // portal: fora da coluna fixa da página (que cria contexto de empilhamento), acima do cabeçalho
        document.body,
      )}
    </>
  );
}
